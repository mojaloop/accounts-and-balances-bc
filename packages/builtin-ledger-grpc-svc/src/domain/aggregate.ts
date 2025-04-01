/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>
GetJournalEntriesByAccountId

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use strict";
import {
    AccountNotFoundError,
    AccountsAndBalancesAccountType, AccountsBalancesHighLevelRequestTypes,
    CurrencyCodeNotFoundError,
    IAccountsBalancesHighLevelRequest,
    IAccountsBalancesHighLevelResponse,
    InvalidAccountParametersError,
    InvalidJournalEntryParametersError,
    PayerFailedLiquidityCheckError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

import {randomUUID} from "crypto";
import {v4 as uuidv4} from "uuid";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";

import {ForbiddenError, IAuthorizationClient, CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";

import {bigintToString, stringToBigint} from "./converters";
import {
	BuiltinLedgerAccount,
	BuiltinLedgerAccountDto,
	BuiltinLedgerJournalEntry,
	BuiltinLedgerJournalEntryDto, CreatedIdMapResponse
} from "./entities";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "./infrastructure";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {Currency, IConfigurationClient} from "@mojaloop/platform-configuration-bc-public-types-lib";
import { BuiltinLedgerPrivileges } from "@mojaloop/accounts-and-balances-bc-privileges-definition-lib";

enum AuditingActions {
	BUILTIN_LEDGER_ACCOUNT_CREATED = "BUILTIN_LEDGER_ACCOUNT_CREATED",
	BUILTIN_LEDGER_JOURNAL_ENTRY_CREATED = "BUILTIN_LEDGER_JOURNAL_ENTRY_CREATED",
	BUILTIN_LEDGER_ACCOUNT_DELETED = "BUILTIN_LEDGER_ACCOUNT_DELETED",
	BUILTIN_LEDGER_ACCOUNT_DEACTIVATED = "BUILTIN_LEDGER_ACCOUNT_DEACTIVATED",
	BUILTIN_LEDGER_ACCOUNT_ACTIVATED = "BUILTIN_LEDGER_ACCOUNT_ACTIVATED"
}

export class BuiltinLedgerAggregate {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _authorizationClient: IAuthorizationClient;
	private readonly _auditingClient: IAuditClient;
	private readonly _builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private readonly _builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
    private readonly _metrics: IMetrics;
    private readonly _requestsHisto: IHistogram;
    private readonly _configClient: IConfigurationClient;
    private readonly _accountCache: Map<string, BuiltinLedgerAccount> = new Map<string, BuiltinLedgerAccount>();
    private readonly _entriesCache: Map<string, BuiltinLedgerJournalEntry> = new Map<string, BuiltinLedgerJournalEntry>();
    private _currencies: Currency[];

	constructor(
		logger: ILogger,
		authorizationClient: IAuthorizationClient,
		auditingClient: IAuditClient,
		accountsRepo: IBuiltinLedgerAccountsRepo,
		journalEntriesRepo: IBuiltinLedgerJournalEntriesRepo,
        configClient: IConfigurationClient,
        metrics: IMetrics
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._authorizationClient = authorizationClient;
		this._auditingClient = auditingClient;
		this._builtinLedgerAccountsRepo = accountsRepo;
		this._builtinLedgerJournalEntriesRepo = journalEntriesRepo;
        this._configClient = configClient;
        this._metrics = metrics;

        this._requestsHisto = metrics.getHistogram("BuiltinLedgerAggregate", "Accounts and Balances Builtin Ledger GRPC Aggregate metrics", ["callName", "success"]);

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
        const timerEndFn = this._requestsHisto.startTimer({callName: "enforcePrivilege"});

        for (const roleId of secCtx.platformRoleIds) {
			if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
                timerEndFn({success: "true"});
                return;
			}
		}
		const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
		this._logger.isWarnEnabled() && this._logger.warn(error.message);
        timerEndFn({success: "false"});
        throw error;
	}

	private _logAction(secCtx: CallSecurityContext, actionName:string){
		this._logger.isDebugEnabled() && this._logger.debug(`User/App '${secCtx.username ?? secCtx.clientId}' called ${actionName}`);
	}

    private _getCurrencyOrThrow(currencyCode:string): Currency{
        const timerEndFn = this._requestsHisto.startTimer({callName: "getCurrencyOrThrow"});
        // Validate the currency code and get the currency.
        const currency: Currency | undefined
            = this._currencies.find((value) => value.code === currencyCode);
        if (!currency) {
            timerEndFn({success: "false"});
            throw new CurrencyCodeNotFoundError(`Currency code: ${currencyCode} not found`);
        }
        timerEndFn({success: "true"});
        return currency;
    }

	private _getAuditSecurityContext(securityContext: CallSecurityContext): AuditSecurityContext {
		return {
			userId: securityContext.username,
			appId: securityContext.clientId,
			role: "" // TODO: get role.
		};
	}

    private async _getAccountsByIds(accountIds: string[]): Promise<BuiltinLedgerAccount[]>{
        const timerEndFn = this._requestsHisto.startTimer({callName: "getAccountsByIds"});
        const notFoundIds:string [] = [];
        const retAccounts: BuiltinLedgerAccount[] = [];

        for(const id of accountIds){
            const acc = this._accountCache.get(id);
            if(acc){
                retAccounts.push(acc);
            }else{
                notFoundIds.push(id);
            }
        }
        const fetched = await this._builtinLedgerAccountsRepo.getAccountsByIds(notFoundIds);
        for(const fetchedAcc of fetched){
            this._accountCache.set(fetchedAcc.id, fetchedAcc);
            retAccounts.push(fetchedAcc);
        }

        timerEndFn({success: "true"});
        return Promise.resolve(retAccounts);
    }

    private async _storeNewJournalEntry(journalEntry: BuiltinLedgerJournalEntry, inBatch:boolean = false): Promise<void>{
        const timerEndFn = this._requestsHisto.startTimer({callName: "storeNewJournalEntry"});
        if(!inBatch){
            return this._builtinLedgerJournalEntriesRepo.storeNewJournalEntry(journalEntry);
        }
        this._entriesCache.set(journalEntry.id, journalEntry);
        timerEndFn({success: "true"});
    }

    private async _flush():Promise<void>{
        const timerEndFn = this._requestsHisto.startTimer({callName: "_flush"});

        // TODO wrap this in a try catch with a reversal of entries and have a test for it
        if(this._entriesCache.size){
            const entries = Array.from(this._entriesCache.values());
            await this._builtinLedgerJournalEntriesRepo.storeNewJournalEntries(entries);
            this._entriesCache.clear();
        }
        if(this._accountCache.size){
            const accounts = Array.from(this._accountCache.values());
            await this._builtinLedgerAccountsRepo.updateAccounts(accounts);
            // TODO check which accounts were changed so we don't bother the repo when not necessary
        }

        // TODO implement LRU to remove not used accounts from cache

        timerEndFn({success: "true"});
    }

    async processHighLevelBatch(secCtx: CallSecurityContext, requests:IAccountsBalancesHighLevelRequest[]):Promise<IAccountsBalancesHighLevelResponse[]> {
        const responses: IAccountsBalancesHighLevelResponse[] = [];
        for (const req of requests) {
            if (req.requestType === AccountsBalancesHighLevelRequestTypes.checkLiquidAndReserve) {
                const timerEndFn = this._requestsHisto.startTimer({callName: "checkLiquidAndReserve"});
                try{
                    const success = await this.checkLiquidAndReserve(
                        secCtx,
                        req.payerPositionAccountId,
                        req.payerLiquidityAccountId!,
                        req.hubJokeAccountId,
                        req.transferAmount,
                        req.currencyCode,
                        req.payerNetDebitCap!,
                        req.transferId,
                        true
                    );
                    responses.push({requestType:req.requestType, requestId: req.requestId, success: success, errorMessage:null});
                    timerEndFn({success: "true"});
                }catch(err:any){
                    responses.push({requestType:req.requestType, requestId: req.requestId, success: false, errorMessage:err.message});
                    timerEndFn({success: "false"});
                }
            } else if (req.requestType === AccountsBalancesHighLevelRequestTypes.cancelReservationAndCommit) {
                const timerEndFn = this._requestsHisto.startTimer({callName: "cancelReservationAndCommit"});
                try{
                    await this.cancelReservationAndCommit(
                        secCtx,
                        req.payerPositionAccountId,
                        req.payeePositionAccountId!,
                        req.hubJokeAccountId,
                        req.transferAmount,
                        req.currencyCode,
                        req.transferId,
                        true
                    );
                    responses.push({requestType:req.requestType, requestId: req.requestId, success: true, errorMessage:null});
                    timerEndFn({success: "true"});
                }catch(err:any){
                    responses.push({requestType:req.requestType, requestId: req.requestId, success: false, errorMessage:err.message});
                    timerEndFn({success: "false"});
                }
            } else if (req.requestType === AccountsBalancesHighLevelRequestTypes.cancelReservation) {
                const timerEndFn = this._requestsHisto.startTimer({callName: "cancelReservation"});
                try{
                    await this.cancelReservation(
                        secCtx,
                        req.payerPositionAccountId,
                        req.hubJokeAccountId,
                        req.transferAmount,
                        req.currencyCode,
                        req.transferId,
                        true
                    );
                    responses.push({requestType:req.requestType, requestId: req.requestId, success: true, errorMessage:null});
                    timerEndFn({success: "true"});
                }catch(err:any){
                    responses.push({requestType:req.requestType, requestId: req.requestId, success: false, errorMessage:err.message});
                    timerEndFn({success: "false"});
                }
            }
        }

        if(responses.length){
            // flush
            await this._flush();
        }
        return Promise.resolve(responses);
    }


	async createAccounts(
		secCtx: CallSecurityContext,
		createReq:{requestedId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string}[]
	): Promise<CreatedIdMapResponse[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_ACCOUNT);
		this._logAction(secCtx, "createAccounts");

		const accountIds: CreatedIdMapResponse[] = [];
		for (const request of createReq) {
			const accountId: CreatedIdMapResponse = await this._createAccount(
				secCtx,
				request.requestedId,
				request.accountType,
				request.currencyCode
			);

			accountIds.push(accountId);
		}
		return accountIds;
	}

	private async _createAccount(
		secCtx: CallSecurityContext,
		requestedId:string,
		accountType:AccountsAndBalancesAccountType,
		currencyCode: string
	): Promise<CreatedIdMapResponse> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_ACCOUNT);

		if (accountType!=="FEE" &&
			accountType!=="POSITION" &&
			accountType!=="SETTLEMENT" &&
			accountType!=="HUB_MULTILATERAL_SETTLEMENT" &&
			accountType!=="HUB_RECONCILIATION") {
			throw new InvalidAccountParametersError("Invalid accountType");
		}

		// Validate the currency code and get the currency.
		const currency = this._currencies.find((value) => value.code === currencyCode);
		if (!currency) {
			throw new CurrencyCodeNotFoundError();
		}

		// try to use requestedId, if used, create a new one
		let myId = requestedId || randomUUID();
		const found = await this._getAccountsByIds([myId]);
		if(found && found.length>0)
			myId = randomUUID();


		const builtinLedgerAccount: BuiltinLedgerAccount = {
			id: myId,
			state: "ACTIVE",
			type: accountType,
			limitCheckMode: "NONE", // TODO: account mode should come from the request dto.
			currencyCode: currency.code,
			currencyDecimals: currency.decimals,
			postedDebitBalance: 0n,
			pendingDebitBalance: 0n,
			postedCreditBalance: 0n,
			pendingCreditBalance: 0n,
			timestampLastJournalEntry: null
		};

		// Store the account.
		try {
			await this._builtinLedgerAccountsRepo.storeNewAccount(builtinLedgerAccount);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

        // no need to audit creation of entries, only accounts activity
        /*const audit_timerEndFn = this._requestsHisto.startTimer({callName: "auditingClient.audit"});
		await this._auditingClient.audit(
			AuditingActions.BUILTIN_LEDGER_ACCOUNT_CREATED,
			true,
			this._getAuditSecurityContext(secCtx),
			[{
				key: "builtinLedgerAccountId",
				value: builtinLedgerAccount.id
			}]
		);
        audit_timerEndFn({success: "true"});*/

        return {
			requestedId: requestedId,
			attributedId: myId
		};
	}

	async createJournalEntries(
		secCtx: CallSecurityContext,
		createReq: {amountStr: string,	currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number,	ownerId: string, pending: boolean
		}[]
	): Promise<string[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_JOURNAL_ENTRY);
		this._logAction(secCtx, "createJournalEntries");

		const journalEntryIds: string[] = [];
		for (const req of createReq) {
			const idResponse = await this._createJournalEntry(
				secCtx,
				req.amountStr,
				req.currencyCode,
				req.creditedAccountId,
				req.debitedAccountId,
				req.timestamp,
				req.ownerId,
				req.pending,
			);
			journalEntryIds.push(idResponse);
		}

		return journalEntryIds;
	}

	private async _createJournalEntry(
		secCtx: CallSecurityContext,
		amountStr:string,
		currencyCode:string,
		creditedAccountId:string,
		debitedAccountId:string,
		timestamp:number,
		ownerId: string,
		pending: boolean,
        inBatch:boolean = false
	): Promise<string> {
        const timerEndFn = this._requestsHisto.startTimer({callName: "createJournalEntry"});
        this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_JOURNAL_ENTRY);

		if(!amountStr || !currencyCode || !debitedAccountId || !creditedAccountId){
			throw new InvalidJournalEntryParametersError("Invalid entry amount, currencyCode or accounts");
		}

		// Validate the currency code and get the currency obj.
		const currency = this._getCurrencyOrThrow(currencyCode);
		// TODO must get and use the currencyDecimals defined in the account

		// Convert the amount to bigint and validate it.
		let amount: bigint;
		try {
			amount = stringToBigint(amountStr, currency.decimals);
		} catch (error: unknown) {
            timerEndFn({success: "false"});
			throw new InvalidJournalEntryParametersError("Invalid entry amount");
		}

		// Check if the debited and credited accounts are the same.
		if (creditedAccountId === debitedAccountId) {
            timerEndFn({success: "false"});
			throw new InvalidJournalEntryParametersError("creditedAccountId and debitedAccountId cannot be the same");
		}

		const builtinLedgerJournalEntry: BuiltinLedgerJournalEntry = {
			//id: randomUUID({disableEntropyCache:true}),
			id: uuidv4(),
			ownerId: ownerId,
			currencyCode: currency.code,
			currencyDecimals: currency.decimals,
			pending: pending,
			amount: amount,
			debitedAccountId: debitedAccountId,
			creditedAccountId: creditedAccountId,
			timestamp: timestamp
		};

		// check if both accounts exist
		const accs: BuiltinLedgerAccount[] = await this._getAccountsByIds([creditedAccountId, debitedAccountId]) || [];
		const creditedAccount = accs.find(value => value.id === creditedAccountId);
		const debitedAccount = accs.find(value => value.id === debitedAccountId);

		if(!creditedAccount || !debitedAccount){
			const msg = "cannot find creditedAccountId or debitedAccountId in _createJournalEntry()";
			this._logger.warn(msg);
            timerEndFn({success: "false"});
			throw new InvalidJournalEntryParametersError(msg);
		}
		if(creditedAccount.currencyCode !== currencyCode || debitedAccount.currencyCode !== currencyCode){
			const msg = "creditedAccountId or debitedAccountId in _createJournalEntry() don't match the entry currencyCode";
			this._logger.warn(msg);
            timerEndFn({success: "false"});
			throw new InvalidJournalEntryParametersError(msg);
		}

		// TODO check limit mode in createEntry

		// Store the journal entry.
		await this._storeNewJournalEntry(builtinLedgerJournalEntry, inBatch);

		try {
			// Update the debited account's debit balance and timestamp.
			const curDebitBalance: bigint = pending ? debitedAccount.pendingDebitBalance:debitedAccount.postedDebitBalance;
            const newDebitBalance: bigint = curDebitBalance + amount;

            if(this._logger.isDebugEnabled()) this._logger.debug(`\tdebitedAccountId: ${debitedAccountId} - curDebitBalance: ${curDebitBalance} - newDebitBalance: ${newDebitBalance} `);

            if(newDebitBalance < 0n){
                const err = new Error("Resulting DebitBalance for account is less than zero in BuiltinLedgerAggregate._createJournalEntry()");
                this._logger.error(err);
                timerEndFn({success: "false"});
                throw err;
            }

            debitedAccount.timestampLastJournalEntry = timestamp;

            // update the correct balance in the account (store in mem by ref)
            if(pending)
                debitedAccount.pendingDebitBalance = newDebitBalance;
            else
                debitedAccount.postedDebitBalance = newDebitBalance;

            // if not in a batch, have to call the repo directly
            if(!inBatch)  {
                await this._builtinLedgerAccountsRepo.updateAccountDebitBalanceAndTimestamp(
                    debitedAccountId,
                    newDebitBalance,
                    pending,
                    timestamp
                );
            }

			// Update the credited account's credit balance and timestamp.
			const curCreditBalance: bigint = pending ? creditedAccount.pendingCreditBalance:creditedAccount.postedCreditBalance;
            const newCreditBalance: bigint = curCreditBalance + amount;

            if(this._logger.isDebugEnabled()) this._logger.debug(`\tcreditedAccountId: ${creditedAccountId} - curCreditBalance: ${curCreditBalance} - newCreditBalance: ${newCreditBalance} `);

            if(newCreditBalance < 0n){
                const err = new Error("Resulting CreditBalance for account is less than zero in BuiltinLedgerAggregate._createJournalEntry()");
                this._logger.error(err);
                timerEndFn({success: "false"});
                throw err;
            }

            creditedAccount.timestampLastJournalEntry = timestamp;

            // update the correct balance in the account (store in mem by ref)
            if(pending)
                creditedAccount.pendingCreditBalance = newCreditBalance;
            else
                creditedAccount.postedCreditBalance = newCreditBalance;

            // if not in a batch, have to call the repo directly
            if(!inBatch) {
                await this._builtinLedgerAccountsRepo.updateAccountCreditBalanceAndTimestamp(
                    creditedAccountId,
                    newCreditBalance,
                    pending,
                    timestamp
                );
            }
		}catch (error){
			// if this fails, revert "this._storeNewJournalEntry(builtinLedgerJournalEntry)"
			// TODO: insert another entry that is the reverse of  builtinLedgerJournalEntry above - reverses as a delete are forbidden by design (append only)
            // await this._builtinLedgerJournalEntriesRepo.reverseJournalEntry(builtinLedgerJournalEntry.id);

			this._logger.error(error);
            timerEndFn({success: "false"});
			throw error;
		}

        // no need to audit creation of entries, only accounts activity
        /*const audit_timerEndFn = this._requestsHisto.startTimer({callName: "auditingClient.audit"});
		await this._auditingClient.audit(
			AuditingActions.BUILTIN_LEDGER_JOURNAL_ENTRY_CREATED,
			true,
			this._getAuditSecurityContext(secCtx),
			[{
				key: "builtinLedgerJournalEntryId",
				value: builtinLedgerJournalEntry.id
			}]
		);
        audit_timerEndFn({success: "true"});*/

        timerEndFn({success: "true"});
		return builtinLedgerJournalEntry.id;

	}

	async getAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<BuiltinLedgerAccountDto[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByIds");

		let builtinLedgerAccounts: BuiltinLedgerAccount[];
		try {
			builtinLedgerAccounts = await this._getAccountsByIds(accountIds);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		const builtinLedgerAccountDtos: BuiltinLedgerAccountDto[]
			= builtinLedgerAccounts.map((builtinLedgerAccount) => {
			const builtinLedgerAccountDto: BuiltinLedgerAccountDto = {
				id: builtinLedgerAccount.id,
				state: builtinLedgerAccount.state,
				type: builtinLedgerAccount.type,
				currencyCode: builtinLedgerAccount.currencyCode,
				postedDebitBalance: bigintToString(builtinLedgerAccount.postedDebitBalance, builtinLedgerAccount.currencyDecimals),
				pendingDebitBalance: bigintToString(builtinLedgerAccount.pendingDebitBalance, builtinLedgerAccount.currencyDecimals),
				postedCreditBalance: bigintToString(builtinLedgerAccount.postedCreditBalance, builtinLedgerAccount.currencyDecimals),
				pendingCreditBalance: bigintToString(builtinLedgerAccount.pendingCreditBalance, builtinLedgerAccount.currencyDecimals),
				timestampLastJournalEntry: builtinLedgerAccount.timestampLastJournalEntry
			};
			return builtinLedgerAccountDto;
		});
		return builtinLedgerAccountDtos;
	}

    // TODO fix this is not using the batching mechanism - _builtinLedgerJournalEntriesRepo.getJournalEntriesByAccountId is not ready
	async getJournalEntriesByAccountId(secCtx: CallSecurityContext, accountId: string): Promise<BuiltinLedgerJournalEntryDto[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_JOURNAL_ENTRY);
		this._logAction(secCtx, "getJournalEntriesByAccountId");

		let builtinLedgerJournalEntries: BuiltinLedgerJournalEntry[];
		try {
			builtinLedgerJournalEntries
				= await this._builtinLedgerJournalEntriesRepo.getJournalEntriesByAccountId(accountId);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		const builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[]
			= builtinLedgerJournalEntries.map((builtinLedgerJournalEntry) => {
			return {
				id: builtinLedgerJournalEntry.id,
				ownerId: builtinLedgerJournalEntry.ownerId,
				currencyCode: builtinLedgerJournalEntry.currencyCode,
				pending: builtinLedgerJournalEntry.pending,
				amount: bigintToString(builtinLedgerJournalEntry.amount, builtinLedgerJournalEntry.currencyDecimals),
				debitedAccountId: builtinLedgerJournalEntry.debitedAccountId,
				creditedAccountId: builtinLedgerJournalEntry.creditedAccountId,
				timestamp: builtinLedgerJournalEntry.timestamp
			};
		});
		return builtinLedgerJournalEntryDtos;
	}

	async deleteAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_DELETE_ACCOUNT);
		this._logAction(secCtx, "deleteAccountsByIds");

		try {
			await this._builtinLedgerAccountsRepo.updateAccountStatesByIds(accountIds, "DELETED");
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	async deactivateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_DEACTIVATE_ACCOUNT);
		this._logAction(secCtx, "deactivateAccountsByIds");

		try {
			await this._builtinLedgerAccountsRepo.updateAccountStatesByIds(accountIds, "INACTIVE");
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	async activateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_ACTIVATE_ACCOUNT);
		this._logAction(secCtx, "activateAccountsByIds");

		try {
			await this._builtinLedgerAccountsRepo.updateAccountStatesByIds(accountIds, "ACTIVE");
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

    async checkLiquidAndReserve(
        secCtx: CallSecurityContext,
        payerPositionAccountId: string, payerLiquidityAccountId: string, hubJokeAccountId:string,
        transferAmount: string, currencyCode:string, payerNetDebitCap:string, transferId:string,
        inBatch:boolean = false
    ):Promise<boolean>{
        //this._logAction(secCtx, "checkLiquidAndReserve");

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(currencyCode);

        // get accounts and their balances from the ledger
        const ledgerAccounts = await this._getAccountsByIds(
            [payerPositionAccountId, payerLiquidityAccountId]
        );
        const payerPosLedgerAcc = ledgerAccounts.find(value => value.id === payerPositionAccountId);
        const payerLiqLedgerAcc = ledgerAccounts.find(value => value.id === payerLiquidityAccountId);

        if (!payerPosLedgerAcc || !payerLiqLedgerAcc) {
            const err = new AccountNotFoundError("Could not find payer accounts on the ledger service");
            this._logger.warn(err.message);
            throw err;
        }

        // check liquidity -> pos.post.dr + pos.pend.dr - pos.post.cr + trx.amount <= liq.bal - NDC
        const payerHasLiq = this._checkParticipantLiquidity(
            payerPosLedgerAcc, payerLiqLedgerAcc, transferAmount,
            payerNetDebitCap, currency.decimals);

        if(!payerHasLiq){
            return false;
            // // TODO audit PayerFailedLiquidityCheckError
            // const err = new PayerFailedLiquidityCheckError("Liquidity check failed");
            // this._logger.warn(err.message);
            // throw err;
        }

        try {
            await this._createJournalEntry(
                secCtx,
                transferAmount,
                currencyCode,
                hubJokeAccountId,
                payerPositionAccountId,
                Date.now(),
                transferId,
                true,
                inBatch
            );
            return true;
        } catch (error: any) {
            this._logger.error(error);
            throw error;
        }
    }

    private _checkParticipantLiquidity(
        payerPos:BuiltinLedgerAccount, payerLiq:BuiltinLedgerAccount,
        trxAmountStr:string, payerNdcStr:string, currencyDecimals:number
    ):boolean{
        const timerEndFn = this._requestsHisto.startTimer({callName: "checkParticipantLiquidity"});
        const positionPostDr = payerPos.postedDebitBalance || 0n; //stringToBigint(payerPos.postedDebitBalance || "0", currencyDecimals);
        const positionPendDr = payerPos.pendingDebitBalance || 0n ; //stringToBigint(payerPos.pendingDebitBalance || "0", currencyDecimals);
        const positionPostCr = payerPos.postedCreditBalance|| 0n; //stringToBigint(payerPos.postedCreditBalance || "0", currencyDecimals);

        const liquidityPostDr = payerLiq.postedDebitBalance || 0n; //stringToBigint(payerLiq.postedDebitBalance || "0", currencyDecimals);
        const liquidityPostCr = payerLiq.postedCreditBalance || 0n ; //stringToBigint(payerLiq.postedCreditBalance || "0", currencyDecimals);

        const trxAmount = stringToBigint(trxAmountStr, currencyDecimals);
        const payerNdc = stringToBigint(payerNdcStr, currencyDecimals);

        const liquidityBal = liquidityPostCr - liquidityPostDr;

        timerEndFn({success: "true"});
        if(positionPostDr + positionPendDr - positionPostCr + trxAmount <= liquidityBal - payerNdc){
            return true;
        }else{
            return false;
        }
    }

    async cancelReservationAndCommit(
        secCtx: CallSecurityContext,
        payerPositionAccountId: string, payeePositionAccountId: string, hubJokeAccountId: string,
        transferAmount: string, currencyCode: string, transferId: string,
        inBatch:boolean = false
    ): Promise<void> {
        this._logAction(secCtx, "cancelReservationAndCommit");

        if (!payerPositionAccountId || !payeePositionAccountId || !hubJokeAccountId) {
            const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservationAndCommit request");
            this._logger.warn(err.message);
            throw err;
        }

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(currencyCode);
        const now = Date.now();
        const amount = stringToBigint(transferAmount, currency.decimals);
        const revertAmount = amount * -1n;

        try {
            // Cancel/void the reservation (negative amount pending entry)
            await this._createJournalEntry(
                secCtx,
                bigintToString(revertAmount, currency.decimals),
                currencyCode,
                hubJokeAccountId,
                payerPositionAccountId,
                now,
                transferId,
                true,
                inBatch
            );

            // Move funds from payer position to payee position (normal entry)
            await this._createJournalEntry(
                secCtx,
                bigintToString(amount, currency.decimals),
                currencyCode,
                payeePositionAccountId,
                payerPositionAccountId,
                now,
                transferId,
                false,
                inBatch
            );
        } catch (error: any) {
            this._logger.error(error);
            throw error;
        }
    }

    async cancelReservation(
        secCtx: CallSecurityContext,
        payerPositionAccountId: string, hubJokeAccountId: string,
        transferAmount: string, currencyCode: string, transferId: string,
        inBatch:boolean = false
    ): Promise<void> {


        if (!payerPositionAccountId || !hubJokeAccountId) {
            const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservation request");
            this._logger.warn(err.message);
            throw err;
        }

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(currencyCode);

        const amount = stringToBigint(transferAmount, currency.decimals);
        const revertAmount = amount * -1n;

        try {
            // Cancel/void the reservation (negative amount pending entry)
            await this._createJournalEntry(
                secCtx,
                bigintToString(revertAmount, currency.decimals),
                currencyCode,
                hubJokeAccountId,
                payerPositionAccountId,
                Date.now(),
                transferId,
                true,
                inBatch
            );
        } catch (error: any) {
            this._logger.error(error);
            throw error;
        }
    }



}
