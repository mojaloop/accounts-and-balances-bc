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
import {ChartOfAccountsPrivilegeNames} from "@mojaloop/accounts-and-balances-bc-privileges-definition-lib";
import {
    ILedgerAdapter,
    LedgerAdapterAccount,
    LedgerAdapterJournalEntry,
    LedgerAdapterRequestId
} from "./infrastructure-types/ledger_adapter";
import {CoaAccount} from "./coa_account";
import {
    AccountAlreadyExistsError,
    AccountNotFoundError,
    AccountsAndBalancesAccount,
    AccountsAndBalancesAccountType,
    AccountsAndBalancesError,
    AccountsAndBalancesJournalEntry,
    AccountsBalancesHighLevelRequestTypes,
    CurrencyCodeNotFoundError,
    IAccountsBalancesHighLevelRequest,
    IAccountsBalancesHighLevelResponse,
    InvalidAccountParametersError,
    InvalidJournalEntryParametersError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {bigintToString, stringToBigint} from "./converters";
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

	private enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
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
		debugger
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

    //async processHighLevelBatch(secCtx: CallSecurityContext, requests:IAccountsBalancesHighLevelRequest[]):Promise<IAccountsBalancesHighLevelResponse[]>{
    async processHighLevelBatch(requests:IAccountsBalancesHighLevelRequest[]):Promise<IAccountsBalancesHighLevelResponse[]>{
        // TODO re-enable enforcePrivilege for the individual
        // this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_JOURNAL_ENTRY);
        // this._logAction(secCtx, "createJournalEntries");

        const errorResponse:IAccountsBalancesHighLevelResponse[] = [];

        // replace coa account Ids with local ledger account Ids
        const prepareRequests_timerEndFn = this._requestsHisto.startTimer({callName: "prepareRequests"});
        for(const req of requests){
            // find CoA accounts
            if(!req.hubJokeAccountId){
                errorResponse.push(this._createHighLevelErrorResponse(req, "Invalid hubJokeAccountId"));
                break;
            }
            if(!req.payerPositionAccountId){
                errorResponse.push(this._createHighLevelErrorResponse(req, "Invalid payerPositionAccountId"));
                break;
            }
            const coaAccountIds:string[] = [req.payerPositionAccountId, req.hubJokeAccountId];

            // optional accounts
            if(req.payerLiquidityAccountId) coaAccountIds.push(req.payerLiquidityAccountId);
            if(req.payeePositionAccountId) coaAccountIds.push(req.payeePositionAccountId);

            // fetch all provided CoA accounts (mandatory and optional)
            //const getAccounts_timerEndFn = this._requestsHisto.startTimer({callName: "getAccounts"});
            const coaAccounts = await this._chartOfAccountsRepo.getAccounts(coaAccountIds);
            //getAccounts_timerEndFn({success: "true"});

            // mandatory we find now
            //const findAccounts_timerEndFn = this._requestsHisto.startTimer({callName: "findAccounts"});
            const payerPosCoaAcc = coaAccounts.find(value => value.id === req.payerPositionAccountId);
            const hubJokeCoaAcc = coaAccounts.find(value => value.id === req.hubJokeAccountId);
            //findAccounts_timerEndFn({success: "true"});

            if(!payerPosCoaAcc){
                errorResponse.push(this._createHighLevelErrorResponse(req, "PayerPositionAccount not found in CoA"));
                break;
            }
            if(!hubJokeCoaAcc){
                errorResponse.push(this._createHighLevelErrorResponse(req, "HubJokeAccount not found in CoA"));
                break;
            }

            // replace the mandatory account ids already
            req.payerPositionAccountId = payerPosCoaAcc.ledgerAccountId;
            req.hubJokeAccountId = hubJokeCoaAcc.ledgerAccountId;

            // do specific verifications and map request
            if(req.requestType === AccountsBalancesHighLevelRequestTypes.checkLiquidAndReserve){
                if(!req.payerLiquidityAccountId){
                    errorResponse.push(this._createHighLevelErrorResponse(req, "Invalid payerLiquidityAccountId"));
                    break;
                }
                const payerLiqCoaAcc = coaAccounts.find(value => value.id === req.payerLiquidityAccountId);
                if(!payerLiqCoaAcc){
                    errorResponse.push(this._createHighLevelErrorResponse(req, "PayerLiquidityAccount not found in CoA"));
                    break;
                }
                req.payerLiquidityAccountId = payerLiqCoaAcc.ledgerAccountId;
            }else if(req.requestType === AccountsBalancesHighLevelRequestTypes.cancelReservationAndCommit){
                if(!req.payeePositionAccountId){
                    errorResponse.push(this._createHighLevelErrorResponse(req, "Invalid payeePositionAccountId"));
                    break;
                }
                const payeePosCoaAcc = coaAccounts.find(value => value.id === req.payeePositionAccountId);
                if(!payeePosCoaAcc){
                    errorResponse.push(this._createHighLevelErrorResponse(req, "PayeePositionAccount not found in CoA"));
                    break;
                }
                req.payeePositionAccountId = payeePosCoaAcc.ledgerAccountId;
            }else if(req.requestType === AccountsBalancesHighLevelRequestTypes.cancelReservation){
                // nothing to replace - already done by code above for mandatory accounts
            }else{
                // invalid request
            }
        }
        prepareRequests_timerEndFn({success: "true"});

        if(errorResponse.length>0){
            return Promise.resolve(errorResponse);
        }

        try {
            const timerEndFn = this._requestsHisto.startTimer({callName: "ledgerProcessHighLevelBatch"});
            const response = await this._ledgerAdapter.processHighLevelBatch(requests);
            timerEndFn({success: "true"});
            return response;
        }catch (error: any) {
            this._logger.error(error);
            throw error;
        }
    }

    private _createHighLevelErrorResponse(req:IAccountsBalancesHighLevelRequest, errorMessage:string):IAccountsBalancesHighLevelResponse{
        return {
            requestId: req.requestId,
            requestType: req.requestType,
            success: false,
            errorMessage: errorMessage
        };
    }

/*

	async checkLiquidAndReserve(
		secCtx: CallSecurityContext,
		payerPositionAccountId: string, payerLiquidityAccountId: string, hubJokeAccountId:string,
		transferAmount: string, currencyCode:string, payerNetDebitCap:string, transferId:string
	):Promise<void>{
        this._logAction(secCtx, "checkLiquidAndReserve");

		// find CoA accounts
		const coaAccounts = await this._chartOfAccountsRepo.getAccounts([payerPositionAccountId, payerLiquidityAccountId, hubJokeAccountId]);
		const payerPosCoaAcc = coaAccounts.find(value => value.id === payerPositionAccountId);
		const payerLiqCoaAcc = coaAccounts.find(value => value.id === payerLiquidityAccountId);
		const hubJokeCoaAcc = coaAccounts.find(value => value.id === hubJokeAccountId);

		if(!payerPosCoaAcc || !payerLiqCoaAcc || !hubJokeCoaAcc ){
			const err = new AccountNotFoundError("Invalid or not found CoA accounts on CheckLiquidAndReserve request");
			this._logger.warn(err.message);
			throw err;
		}

		// Validate the currency code and get the currency.
		const currency = this._getCurrencyOrThrow(currencyCode);
        // TODO check the COA accounts match the currency

        try {
            await this._ledgerAdapter.checkLiquidAndReserve(
                payerPosCoaAcc.ledgerAccountId,
                payerLiqCoaAcc.ledgerAccountId,
                hubJokeCoaAcc.ledgerAccountId,
                transferAmount,
                currencyCode,
                payerNetDebitCap,
                transferId
                );
        } catch (error: any) {
            this._logger.error(error);
            throw error;
        }
	}

	async cancelReservationAndCommit(
		secCtx: CallSecurityContext,
		payerPositionAccountId: string, payeePositionAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, transferId: string
	): Promise<void> {
        this._logAction(secCtx, "cancelReservationAndCommit");

		// find CoA accounts
		const coaAccounts = await this._chartOfAccountsRepo.getAccounts([payerPositionAccountId, payeePositionAccountId, hubJokeAccountId]);
		const payerPosCoaAcc = coaAccounts.find(value => value.id === payerPositionAccountId);
		const payeePosCoaAcc = coaAccounts.find(value => value.id === payeePositionAccountId);
		const hubJokeCoaAcc = coaAccounts.find(value => value.id===hubJokeAccountId);

		if (!payerPosCoaAcc || !payeePosCoaAcc || !hubJokeCoaAcc) {
			const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservationAndCommit request");
			this._logger.warn(err.message);
			throw err;
		}

		// Validate the currency code and get the currency.
		const currency = this._getCurrencyOrThrow(currencyCode);
        // TODO check the COA accounts match the currency

        try {
            await this._ledgerAdapter.cancelReservationAndCommit(
                payerPosCoaAcc.ledgerAccountId,
                payeePosCoaAcc.ledgerAccountId,
                hubJokeCoaAcc.ledgerAccountId,
                transferAmount,
                currencyCode,
                transferId
            );
        } catch (error: any) {
            this._logger.error(error);
            throw error;
        }
	}

	async cancelReservation(
		secCtx: CallSecurityContext,
		payerPositionAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, transferId: string
	): Promise<void> {


		// find CoA accounts
		const coaAccounts = await this._chartOfAccountsRepo.getAccounts([payerPositionAccountId, hubJokeAccountId]);
		const payerPosCoaAcc = coaAccounts.find(value => value.id===payerPositionAccountId);
		const hubJokeCoaAcc = coaAccounts.find(value => value.id===hubJokeAccountId);

		if (!payerPosCoaAcc || !hubJokeCoaAcc) {
			const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservation request");
			this._logger.warn(err.message);
			throw err;
		}

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(currencyCode);
        // TODO check the COA accounts match the currency

        try {
            await this._ledgerAdapter.cancelReservation(
                payerPosCoaAcc.ledgerAccountId,
                hubJokeCoaAcc.ledgerAccountId,
                transferAmount,
                currencyCode,
                transferId
            );
        } catch (error: any) {
            this._logger.error(error);
            throw error;
        }
	}
*/

	async createAccounts(
		secCtx: CallSecurityContext,
		createReqs: { requestedId: string, ownerId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string }[]
	): Promise<string[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_ACCOUNT);
		this._logAction(secCtx, "createAccounts");

		// Extract the ids which were provided.
		const internalAccountIds: string[] = [];
		createReqs.forEach((account) => {
			if (account.requestedId) {
				internalAccountIds.push(account.requestedId);
			}
		});

		if (internalAccountIds.length >= 0) {
			const accountsExist: boolean = await this._chartOfAccountsRepo.accountsExistByInternalIds(internalAccountIds);
			if (accountsExist) {
				throw new AccountAlreadyExistsError(`Account with Id: ${internalAccountIds} already exists`);
			}
		}

		const coaAccounts: CoaAccount[] = [];
		const ledgerCreateReqs: { requestedId: string, type: string, currencyCode: string }[] = [];
		const accountIds: string[] = [];

		for (const request of createReqs) {
			if (!request.ownerId) {
				throw new InvalidAccountParametersError("Invalid account.ownerId");
			}

			if (request.accountType!=="FEE" &&
				request.accountType!=="POSITION" &&
				request.accountType!=="SETTLEMENT" &&
				request.accountType!=="HUB_MULTILATERAL_SETTLEMENT" &&
				request.accountType!=="HUB_RECONCILIATION") {
				throw new InvalidAccountParametersError("Invalid account.type");
			}

			// Validate the currency code and get the currency.
			const currency = this._getCurrencyOrThrow(request.currencyCode);

			// Note: the caller createAccounts() has already checked for possible duplicate ids
			// try to use requestedId, if used, create a new one
			request.requestedId = request.requestedId || randomUUID();
			accountIds.push(request.requestedId);

			coaAccounts.push({
				id: request.requestedId,
				ledgerAccountId: request.requestedId, // try this, reset after we get the final id from the ledgerImplementation
				ownerId: request.ownerId,
				state: "ACTIVE",
				type: request.accountType,
				currencyCode: request.currencyCode,
				currencyDecimals: currency.decimals
			});

			ledgerCreateReqs.push({
				requestedId: request.requestedId,
				type: request.accountType,
				currencyCode: request.currencyCode,
			});
		}


		try {
			await this._chartOfAccountsRepo.storeAccounts(coaAccounts);
			const idsResponse = await this._ledgerAdapter.createAccounts(ledgerCreateReqs);
			if(idsResponse.length !==ledgerCreateReqs.length){
				const err = new AccountsAndBalancesError("Could create all the request accounts in the ledger system");
				this._logger.error(err);
				throw err;
			}

			for(const resp of idsResponse){
				if(resp.attributedId !== resp.requestedId){
					const coaAcc = coaAccounts.find(value => value.id === resp.requestedId);
					if(!coaAcc){
						const err = new AccountsAndBalancesError("Could not found CoA account to update ledger account id");
						this._logger.error(err);
						throw err;
					}
					coaAcc.ledgerAccountId = resp.attributedId;
					await this._chartOfAccountsRepo.storeAccounts([coaAcc]);
				}
			}
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
		return accountIds;
	}

	async createJournalEntries(
		secCtx: CallSecurityContext,
		createReqs: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		}[]
	): Promise<string[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_JOURNAL_ENTRY);
		this._logAction(secCtx, "createJournalEntries");

		const now = Date.now();

		for(const req of createReqs){
			// Validate the currency code and get the currency.
			// we don't actually need it, this just to assert it exists
			this._getCurrencyOrThrow(req.currencyCode);

			if (!req.amountStr || !req.currencyCode || !req.debitedAccountId || !req.creditedAccountId) {
				throw new InvalidJournalEntryParametersError("Invalid entry amount, currencyCode or accounts");
			}

			req.requestedId = req.requestedId || randomUUID();
			req.timestamp = now;
		}

		let journalEntryIds: string[];
		try {
			journalEntryIds = await this._ledgerAdapter.createJournalEntries(createReqs);
			// journal entries are not persisted at the CoA service, nothing else to do
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		// return the ids attributed by the ledger
		return journalEntryIds;
	}

	async getAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<AccountsAndBalancesAccount[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByIds");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccounts(accountIds);
		if (!coaAccounts.length) {
			return [];
		}

		const accounts: AccountsAndBalancesAccount[] = await this._getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

	async getAccountsByOwnerId(secCtx: CallSecurityContext, ownerId: string): Promise<AccountsAndBalancesAccount[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByOwnerId");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccountsByOwnerId(ownerId);
		if (!coaAccounts.length) {
			return [];
		}

		const accounts: AccountsAndBalancesAccount[] = await this._getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

	async getJournalEntriesByAccountId(secCtx: CallSecurityContext, accountId: string): Promise<AccountsAndBalancesJournalEntry[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_JOURNAL_ENTRY);
		this._logAction(secCtx, "getJournalEntriesByAccountId");

		const coaAccount: CoaAccount | undefined =
			(await this._chartOfAccountsRepo.getAccounts([accountId]))[0];
		if (!coaAccount) {
			return [];
		}

		let ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[];
		try {
			ledgerAdapterJournalEntries =
				await this._ledgerAdapter.getJournalEntriesByAccountId(accountId, coaAccount.currencyDecimals);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		const journalEntries: AccountsAndBalancesJournalEntry[] = ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const journalEntry: AccountsAndBalancesJournalEntry = {
				id: ledgerAdapterJournalEntry.id,
				ownerId: ledgerAdapterJournalEntry.ownerId,
				currencyCode: ledgerAdapterJournalEntry.currencyCode,
				amount: ledgerAdapterJournalEntry.amount,
				pending: ledgerAdapterJournalEntry.pending,
				debitedAccountId: ledgerAdapterJournalEntry.debitedAccountId,
				creditedAccountId: ledgerAdapterJournalEntry.creditedAccountId,
				timestamp: ledgerAdapterJournalEntry.timestamp
			};
			return journalEntry;
		});
		return journalEntries;
	}

	async getJournalEntriesByOwnerId(secCtx: CallSecurityContext, ownerId: string): Promise<AccountsAndBalancesJournalEntry[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_JOURNAL_ENTRY);
		this._logAction(secCtx, "getJournalEntriesByOwnerId");



		let ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[];
		try {
			ledgerAdapterJournalEntries =
				await this._ledgerAdapter.getJournalEntriesByOwnerId(ownerId);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		const journalEntries: AccountsAndBalancesJournalEntry[] = ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const journalEntry: AccountsAndBalancesJournalEntry = {
				id: ledgerAdapterJournalEntry.id,
				ownerId: ledgerAdapterJournalEntry.ownerId,
				currencyCode: ledgerAdapterJournalEntry.currencyCode,
				amount: ledgerAdapterJournalEntry.amount,
				pending: ledgerAdapterJournalEntry.pending,
				debitedAccountId: ledgerAdapterJournalEntry.debitedAccountId,
				creditedAccountId: ledgerAdapterJournalEntry.creditedAccountId,
				timestamp: ledgerAdapterJournalEntry.timestamp
			};
			return journalEntry;
		});
		return journalEntries;
	}

	async deleteAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_DELETE_ACCOUNT);
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
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_DEACTIVATE_ACCOUNT);
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
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_REACTIVATE_ACCOUNT);
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
	}
}
