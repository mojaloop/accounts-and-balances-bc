/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/
"use strict";


import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {CallSecurityContext, IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {ForbiddenError} from "@mojaloop/security-bc-public-types-lib";
import {ChartOfAccountsPrivilegeNames} from "./privilege_names";
import {
    ILedgerAdapter, ILedgerAdapterCreateAccountRequestItem, ILedgerAdapterCreateAccountResponseItem,
} from "./infrastructure-types/ledger_adapter";
import {CoaAccount} from "./coa_account";
import {
    AccountAlreadyExistsError,
    AccountNotFoundError,
    AccountsAndBalancesError, AnbAccountType,
    CurrencyCodeNotFoundError,
    IAnbCreateAccountRequest, IAnbCreateResponse,
    InvalidAccountParametersError,
    InvalidJournalEntryParametersError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {IChartOfAccountsRepo} from "./infrastructure-types/chart_of_accounts_repo";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {Currency, IConfigurationClient} from "@mojaloop/platform-configuration-bc-public-types-lib";


export class AccountsAndBalancesAggregate {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _chartOfAccountsRepo: IChartOfAccountsRepo;
	private readonly _ledgerAdapter: ILedgerAdapter;
	private readonly _authorizationClient: IAuthorizationClient;
	private readonly _auditingClient: IAuditClient;
    private readonly _metrics: IMetrics;
    private readonly _configClient: IConfigurationClient;
    private readonly _requestsHisto: IHistogram;
    private _currencies: Currency[];

    private _accountsChangedHandler: (coaAccoubts:CoaAccount[])=>void;

	constructor(
		logger: ILogger,
		authorizationClient: IAuthorizationClient,
		auditingClient: IAuditClient,
		accountsRepo: IChartOfAccountsRepo,
		ledgerAdapter: ILedgerAdapter,
        configClient: IConfigurationClient,
        metrics: IMetrics
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._authorizationClient = authorizationClient;
		this._auditingClient = auditingClient;
		this._chartOfAccountsRepo = accountsRepo;
		this._ledgerAdapter = ledgerAdapter;
        this._configClient = configClient;
        this._metrics = metrics;

        this._requestsHisto = metrics.getHistogram("AccountsAndBalancesAggregate", "Accounts and Balances GRPC Aggregate metrics", ["callName", "success"]);

        this._currencies = this._configClient.globalConfigs.getCurrencies();
        if(!this._currencies){
            throw new Error("Could not get currencies from global configs - cannot continue");
        }
        this._configClient.setChangeHandlerFunction(this._reloadSettings.bind(this));
    }

    private async _reloadSettings(type: "BC" | "GLOBAL"): Promise<void>{
        // configurations changed centrally, reload what needs reloading
        if(type ==="GLOBAL"){
            this._currencies = this._configClient.globalConfigs.getCurrencies();
        }
    }

	private _enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
		for (const roleId of secCtx.platformRoleIds) {
			if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
				return;
			}
		}
		const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
		this._logger.isWarnEnabled() && this._logger.warn(error.message);
		throw error;
	}

	private _logAction(secCtx: CallSecurityContext, actionName: string) {
		this._logger.isDebugEnabled() && this._logger.debug(`User/App '${secCtx.username ?? secCtx.clientId}' called ${actionName}`);
	}

	private _getCurrencyOrThrow(currencyCode:string): Currency{
		// Validate the currency code and get the currency.
		const currency: Currency | undefined
			= this._currencies.find((value) => value.code === currencyCode);
		if (!currency) {
			throw new CurrencyCodeNotFoundError(`Currency code: ${currencyCode} not found`);
		}
		return currency;
	}

    private _notifyAccountsChanged(changedAccounts:CoaAccount[]):void{
        if(!this._accountsChangedHandler || !changedAccounts || changedAccounts.length<=0) return;

        setImmediate(()=>{
            this._accountsChangedHandler(changedAccounts);
        });
    }

    setAccountsChangedHandler(handler:(coaAccounts:CoaAccount[])=>void): void{
        this._accountsChangedHandler = handler;
    }

	async createAccounts(
		secCtx: CallSecurityContext,
		createReqs: IAnbCreateAccountRequest[]
	): Promise<IAnbCreateResponse[]> {
		this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_ACCOUNT);
		this._logAction(secCtx, "createAccounts");

		// Extract the ids which were provided to find possible already existing ones
		const idsToCheckForDuplicates: string[] = createReqs.flatMap(value => {
            return value.requestedId ? [value.requestedId] : [];
        });

        this._logger.isDebugEnabled() && this._logger.debug(`Got createAccount request for ids: ${idsToCheckForDuplicates.join(",")}...`);

		if (idsToCheckForDuplicates.length >= 0) {
			const accountsExist: boolean = await this._chartOfAccountsRepo.accountsExistByInternalIds(idsToCheckForDuplicates);
			if (accountsExist) {
				throw new AccountAlreadyExistsError(`Account with Id: ${idsToCheckForDuplicates} already exists`);
			}
		}

        // construct ledger create requests
        const ledgerCreateReqs: ILedgerAdapterCreateAccountRequestItem[] = [];
		for (const request of createReqs) {
			if (!request.ownerId) {
				throw new InvalidAccountParametersError("Invalid account.ownerId");
			}

            if (request.type!=="POSITION" && request.type!=="LIQUIDITY" &&
                request.type!=="SETTLEMENT" && request.type!=="HUB_RECONCILIATION") {
                throw new InvalidAccountParametersError("Invalid account.type");
            }

            // validate currency
            const currency = this._getCurrencyOrThrow(request.currencyCode);

			// Note: the caller createAccounts() has already checked for possible duplicate ids
			// try to use requestedId, if undefined, create a new one
			request.requestedId = request.requestedId || randomUUID();

			ledgerCreateReqs.push({
				requestedId: request.requestedId,
                ownerId: request.ownerId,
                accountType: request.type,
				currencyCode: currency.code
			});
		}

        // create the accounts in the remote ledger
        let ledgerRespIds: ILedgerAdapterCreateAccountResponseItem[];
        try{
            ledgerRespIds = await this._ledgerAdapter.createAccounts(ledgerCreateReqs);
        } catch (error: any) {
            this._logger.error(error);
            throw new AccountsAndBalancesError(`Could not create accounts in the remote ledger - Error: ${error?.message ?? "unknown"}`);
        }

        // find differently attributed ids and update the local coaAccoun ledger id
        const coaAccountsToCreate: CoaAccount[] = [];
        const returnAccountIds: IAnbCreateResponse[] = [];
        for(const resp of ledgerRespIds){
            const foundCreateReq = createReqs.find(createReq => createReq.requestedId === resp.requestedId);
            if(!foundCreateReq) {
                const err= new AccountsAndBalancesError("invalid response from ledgerAdapter.createAccounts, cannot find request for response requestedId");
                this._logger.error(err);
                throw err;
            }

            returnAccountIds.push({
                requestedId: resp.requestedId,
                attributedId: resp.attributedId
            });

            coaAccountsToCreate.push({
                id: resp.requestedId,
                ledgerAccountId: resp.attributedId,
                ownerId: foundCreateReq.ownerId,
                state: "ACTIVE",
                type: foundCreateReq.type,
                currencyCode: foundCreateReq.currencyCode,
                currencyDecimals: this._getCurrencyOrThrow(foundCreateReq.currencyCode).decimals
            });
        }

        // if ledger creation is successful store local coaAccounts in the repo
        try {
            await this._chartOfAccountsRepo.storeAccounts(coaAccountsToCreate);
        } catch (error: any) {
            this._logger.error(error);
            throw new AccountsAndBalancesError(`Could not store new CoaAccounts - Error: ${error?.message ?? "unknown"}`);
        }

        // after finishing the mapping and leavint the system in the best possible state, check for any not created account
        if(ledgerRespIds.length !== createReqs.length){
            const err = new AccountsAndBalancesError("Could create all the request accounts in the ledger system");
            this._logger.error(err);
            throw err;
        }

        this._logger.isDebugEnabled() && this._logger.debug(`createAccount created: ${returnAccountIds.length} accounts successfully`);

        // is wrapped in a setImmediate
        this._notifyAccountsChanged(coaAccountsToCreate);
		return returnAccountIds;
	}

    async getCoaAccountsByIds(secCtx: CallSecurityContext, ids:string[]): Promise<CoaAccount[]>{
        this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
        this._logAction(secCtx, "viewAccounts");

        const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccounts(ids);
        if (!coaAccounts.length) {
            return [];
        }

        return coaAccounts;
    }

    // unprotected, make sure the GRPC calls this in a secure context
    // if client call, should have ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT
    async getCoaAccountsByTypes(types:AnbAccountType[]): Promise<CoaAccount[]>{
        const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccountsByTypes(types);
        if (!coaAccounts.length) {
            return [];
        }

        return coaAccounts;
    }

    async getCoaActiveCurrencies(): Promise<Currency[]>{
        return Promise.resolve(this._currencies);
    }

    // async getCoaAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<CoaAccount[]>{
    //     this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
    //     this._logAction(secCtx, "getAccountsByTypes");
    //
    //     const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccounts(accountIds);
    //     if (!coaAccounts.length) {
    //         return [];
    //     }
    //
    //     return coaAccounts;
    // }

    /*
    * OLD GET account methods that go to the ledger
    * */

/*	async getAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<CoaAccount[]> {
		this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByIds");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccounts(accountIds);
		if (!coaAccounts.length) {
			return [];
		}

		const accounts: AccountsAndBalancesAccount[] = await this._getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}*/

	/*async getAccountsByOwnerId(secCtx: CallSecurityContext, ownerId: string): Promise<AccountsAndBalancesAccount[]> {
		this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByOwnerId");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccountsByOwnerId(ownerId);
		if (!coaAccounts.length) {
			return [];
		}

		const accounts: AccountsAndBalancesAccount[] = await this._getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

    async deleteAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_DELETE_ACCOUNT);
		this._logAction(secCtx, "deleteAccountsByIds");

		const accounts = await this._chartOfAccountsRepo.getAccounts(accountIds);
		if (!accounts || accounts.length <= 0) {
			throw new AccountNotFoundError();
		}

		if (accounts[0].state !== "ACTIVE") {
			throw new AccountsAndBalancesError("Cannot deactivate an account that is not active");
		}
		try {
			await this._ledgerAdapter.deleteAccountsByIds(accountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

        accounts.forEach(acc => {
            acc.state = "DELETED";
        });

		await this._chartOfAccountsRepo.storeAccounts(accounts);
	}

	async deactivateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_DEACTIVATE_ACCOUNT);
		this._logAction(secCtx, "deactivateAccountsByIds");

		const accounts = await this._chartOfAccountsRepo.getAccounts(accountIds);
		if (!accounts || accounts.length <= 0) {
			throw new AccountNotFoundError();
		}

		if (accounts[0].state!=="ACTIVE") {
			throw new AccountsAndBalancesError("Cannot deactivate an account that is not active");
		}

		try {
			await this._ledgerAdapter.deactivateAccountsByIds(accountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

        accounts.forEach(acc => {
            acc.state = "INACTIVE";
        });

        await this._chartOfAccountsRepo.storeAccounts(accounts);
	}

	async reactivateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_REACTIVATE_ACCOUNT);
		this._logAction(secCtx, "reactivateAccountsByIds");

		const accounts = await this._chartOfAccountsRepo.getAccounts(accountIds);
		if (!accounts || accounts.length<=0) {
			throw new AccountNotFoundError();
		}

		if(accounts[0].state !== "INACTIVE"){
			throw new AccountsAndBalancesError("Cannot reactivate an account that is not inactive");
		}

		try {
			await this._ledgerAdapter.reactivateAccountsByIds(accountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

        accounts.forEach(acc => {
            acc.state = "ACTIVE";
        });

        await this._chartOfAccountsRepo.storeAccounts(accounts);
	}

	private async _getAccountsByExternalIdsOfCoaAccounts(coaAccounts: CoaAccount[]): Promise<AccountsAndBalancesAccount[]> {
		const externalAccountIds: LedgerAdapterRequestId[] = coaAccounts.map((coaAccount) => {
			return {id: coaAccount.ledgerAccountId, currencyDecimals: coaAccount.currencyDecimals};
		});

		let ledgerAdapterAccounts: LedgerAdapterAccount[];
		try {
			ledgerAdapterAccounts = await this._ledgerAdapter.getAccountsByIds(externalAccountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		const accounts: AccountsAndBalancesAccount[] = ledgerAdapterAccounts.map((ledgerAdapterAccount) => {
			const coaAccount: CoaAccount | undefined = coaAccounts.find((coaAccount) => {
				return coaAccount.ledgerAccountId === ledgerAdapterAccount.id;
			});
			if (!coaAccount) {
				throw new Error();
			}

			const balance: string = this._calculateBalanceString(
				ledgerAdapterAccount.postedDebitBalance || "0",
				ledgerAdapterAccount.postedCreditBalance || "0",
				coaAccount.currencyDecimals
			);

			const account: AccountsAndBalancesAccount = {
				id: coaAccount.id,
				ownerId: coaAccount.ownerId,
				state: coaAccount.state,
				type: coaAccount.type,
				currencyCode: coaAccount.currencyCode,
				postedDebitBalance: ledgerAdapterAccount.postedDebitBalance,
				pendingDebitBalance: ledgerAdapterAccount.pendingDebitBalance,
				postedCreditBalance: ledgerAdapterAccount.postedCreditBalance,
				pendingCreditBalance: ledgerAdapterAccount.pendingCreditBalance,
				balance: balance,
				timestampLastJournalEntry: ledgerAdapterAccount.timestampLastJournalEntry
			};
			return account;
		});
		return accounts;
	}

	private _calculateBalanceString(debitBalanceString: string, creditBalanceString: string, currencyDecimals: number): string {
		const debitBalanceBigint: bigint = stringToBigint(debitBalanceString, currencyDecimals);
		const creditBalanceBigint: bigint = stringToBigint(creditBalanceString, currencyDecimals);
		const balanceBigint: bigint = creditBalanceBigint - debitBalanceBigint;
		const balanceString: string = bigintToString(balanceBigint, currencyDecimals);
		return balanceString;
	}*/
}
