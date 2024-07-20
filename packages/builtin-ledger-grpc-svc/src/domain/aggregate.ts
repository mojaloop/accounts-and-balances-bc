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
GetJournalEntriesByAccountId
 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/
"use strict";
import {
    AccountNotFoundError,
    AnbAccountType,
    AnbHighLevelRequestTypes,
    CurrencyCodeNotFoundError,
    IAnbCancelReservationAndCommitRequest,
    IAnbCancelReservationRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse,
    InvalidAccountParametersError,
    InvalidJournalEntryParametersError,
    PayerFailedLiquidityCheckError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

import {randomUUID} from "crypto";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";

import {ForbiddenError, IAuthorizationClient, CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";
import {BuiltinLedgerPrivileges} from "./privilege_names";

import {bigintToString, stringToBigint} from "./converters";
import {
    BuiltinLedgerAccount, BuiltinLedgerAccountDto,
    BuiltinLedgerJournalEntry, BuiltinLedgerJournalEntryDto,
    CreatedIdMapResponse
} from "./entities";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "./infrastructure";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {Currency, IConfigurationClient} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {request} from "express";

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
    private readonly _batchEntriesBuffer: BuiltinLedgerJournalEntry[] = [];
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

	private _logAction(secCtx: CallSecurityContext, actionName:string, success:boolean=true){
		this._logger.isDebugEnabled() && this._logger.debug(`User/App '${secCtx.username ?? secCtx.clientId}' called ${actionName} - success: ${success}`);
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

	private _getAuditSecurityContext(securityContext: CallSecurityContext): AuditSecurityContext {
		return {
			userId: securityContext.username,
			appId: securityContext.clientId,
			role: "" // TODO: get role.
		};
	}

    private async _getAccountsByIds(accountIds: string[]): Promise<BuiltinLedgerAccount[]>{
        const timerEndFn = this._requestsHisto.startTimer({callName: "getAccountsByIds"});
        const retAccounts: BuiltinLedgerAccount[] = [];

        const notFoundIds:string [] = [];
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

    private async _storeNewJournalEntry(journalEntry: BuiltinLedgerJournalEntry, inBatch:boolean = false): Promise<string | null>{
        if(!inBatch){
            const timerEndFn = this._requestsHisto.startTimer({callName: "storeNewJournalEntry_inRepo"});
            const id = await this._builtinLedgerJournalEntriesRepo.storeNewJournalEntry(journalEntry);
            timerEndFn({success: "true"});
            return id;
        }

        const timerEndFn = this._requestsHisto.startTimer({callName: "storeNewJournalEntry_inBuffer"});
        this._batchEntriesBuffer.push(journalEntry);
        timerEndFn({success: "true"});
        return null; // batch mode
    }

    private async _flush():Promise<void>{
        const timerEndFn = this._requestsHisto.startTimer({callName: "_flush"});

        const promises: Promise<void>[]  = [];
        // TODO wrap this in a try catch with a reversal of entries and have a test for it
        if(this._batchEntriesBuffer.length){
            promises.push(new Promise(resolve => {
                const timerEndFn_sub1 = this._requestsHisto.startTimer({callName: "_flush_storeNewJournalEntries"});
                this._builtinLedgerJournalEntriesRepo.storeNewJournalEntries(this._batchEntriesBuffer).then(()=>{
                    timerEndFn_sub1({success: "true"});
                    return resolve();
                });
            }));
        }
        if(this._accountCache.size){
            promises.push(new Promise(resolve => {
                const timerEndFn_sub2 = this._requestsHisto.startTimer({callName: "_flush_updateAccounts"});
                this._builtinLedgerAccountsRepo.updateAccounts([...this._accountCache.values()]).then(()=>{
                    timerEndFn_sub2({success: "true"});
                    return resolve();
                });
                // TODO check which accounts were changed so we don't bother the repo when not necessary
            }));
        }

        if(promises.length>0){
            await Promise.all(promises);
        }

        if(this._batchEntriesBuffer.length) this._batchEntriesBuffer.length = 0; // clean the buffer
        if(this._accountCache.size) this._accountCache.clear(); // comment to enable local in-mem cache

        // TODO implement LRU to remove not used accounts from cache

        timerEndFn({success: "true"});
    }

    async processHighLevelBatch(secCtx: CallSecurityContext, requests:IAnbHighLevelRequest[]):Promise<IAnbHighLevelResponse[]> {
        this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_JOURNAL_ENTRY);

        let totalCheckLiquidAndReserveSecs = 0, totalCancelReservationAndCommitSecs = 0, totalCancelReservationSecs = 0;

        const responses: IAnbHighLevelResponse[] = [];
        for (const req of requests) {
            if (req.requestType === AnbHighLevelRequestTypes.checkLiquidAndReserve) {
                const specificRequest = req as IAnbCheckLiquidAndReserveRequest;
                const timerEndFn = this._requestsHisto.startTimer({callName: "checkLiquidAndReserve_unit"});
                try{
                    const success = await this._checkLiquidAndReserve(secCtx, specificRequest, true);
                    responses.push({requestType:specificRequest.requestType, requestId: specificRequest.requestId, success: success, errorMessage:null});
                    totalCheckLiquidAndReserveSecs += timerEndFn({success: "true"});
                }catch(err:any){
                    responses.push({requestType:specificRequest.requestType, requestId: specificRequest.requestId, success: false, errorMessage:err.message});
                    totalCheckLiquidAndReserveSecs += timerEndFn({success: "false"});
                    break; // cannot continue if a previous item has an error
                }
            } else if (req.requestType === AnbHighLevelRequestTypes.cancelReservationAndCommit) {
                const specificRequest = req as IAnbCancelReservationAndCommitRequest;
                const timerEndFn = this._requestsHisto.startTimer({callName: "cancelReservationAndCommit_unit"});
                try{
                    await this._cancelReservationAndCommit(secCtx, specificRequest, true);
                    responses.push({requestType:specificRequest.requestType, requestId: specificRequest.requestId, success: true, errorMessage:null});
                    totalCancelReservationAndCommitSecs += timerEndFn({success: "true"});
                }catch(err:any){
                    responses.push({requestType:specificRequest.requestType, requestId: specificRequest.requestId, success: false, errorMessage:err.message});
                    totalCancelReservationAndCommitSecs += timerEndFn({success: "false"});
                    break; // cannot continue if a previous item has an error
                }
            } else if (req.requestType === AnbHighLevelRequestTypes.cancelReservation) {
                const specificRequest = req as IAnbCancelReservationRequest;
                const timerEndFn = this._requestsHisto.startTimer({callName: "cancelReservation_unit"});
                try{
                    await this._cancelReservation(secCtx, specificRequest, true);
                    responses.push({requestType:specificRequest.requestType, requestId: specificRequest.requestId, success: true, errorMessage:null});
                    totalCancelReservationSecs += timerEndFn({success: "true"});
                }catch(err:any){
                    responses.push({requestType:specificRequest.requestType, requestId: specificRequest.requestId, success: false, errorMessage:err.message});
                    totalCancelReservationSecs += timerEndFn({success: "false"});
                    break; // cannot continue if a previous item has an error
                }
            }
        }

        this._requestsHisto.observe({callName: "checkLiquidAndReserve_total"}, totalCheckLiquidAndReserveSecs);
        this._requestsHisto.observe({callName: "cancelReservationAndCommit_total"}, totalCancelReservationAndCommitSecs);
        this._requestsHisto.observe({callName: "cancelReservation_total"}, totalCancelReservationSecs);

        if(responses.length){
            // flush
            await this._flush();
        }
        return Promise.resolve(responses);
    }

	async createAccounts(
		secCtx: CallSecurityContext,
		createReq:{requestedId: string, accountType: AnbAccountType, currencyCode: string}[]
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
		accountType:AnbAccountType,
		currencyCode: string
	): Promise<CreatedIdMapResponse> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_ACCOUNT);

		if (accountType!=="POSITION" && accountType!=="SETTLEMENT" &&
			accountType!=="LIQUIDITY" && accountType!=="HUB_RECONCILIATION") {
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
		if(found && found.length>0) {
            myId = randomUUID();
        }

		const builtinLedgerAccount: BuiltinLedgerAccount = {
			id: myId,
			state: "ACTIVE",
			//type: accountType,
			// limitCheckMode: "NONE", // TODO: account mode should come from the request dto.
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

        // audit creation of accounts
        const audit_timerEndFn = this._requestsHisto.startTimer({callName: "auditingClient.audit"});
		await this._auditingClient.audit(
			AuditingActions.BUILTIN_LEDGER_ACCOUNT_CREATED,
			true,
			this._getAuditSecurityContext(secCtx),
			[{
				key: "builtinLedgerAccountId",
				value: builtinLedgerAccount.id
			}]
		);
        audit_timerEndFn({success: "true"});

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
				req.amountStr,
				req.currencyCode,
				req.creditedAccountId,
				req.debitedAccountId,
				req.timestamp,
				req.ownerId,
				req.pending,
			);
            if(!idResponse) throw new Error("Invalid response from _createJournalEntry() in non batch mode, expected to return created entry id");
			journalEntryIds.push(idResponse);
		}

		return journalEntryIds;
	}


    /**
     * Creates a journal entry with all checks
     * (if in batch mode, it will buffer the entry to later flush;
     * if not in batch mode will create immediately and return the created id)
     * @param amountStr
     * @param currencyCode
     * @param creditedAccountId
     * @param debitedAccountId
     * @param timestamp
     * @param ownerId
     * @param pending
     * @param inBatch
     * @private
     */
	private async _createJournalEntry(
		amountStr:string,
		currencyCode:string,
		creditedAccountId:string,
		debitedAccountId:string,
		timestamp:number,
		ownerId: string,
		pending: boolean,
        inBatch:boolean = false
	): Promise<string | null> {
        const timerEndFn = this._requestsHisto.startTimer({callName: "createJournalEntry"});

		if(!amountStr || !currencyCode || !debitedAccountId || !creditedAccountId){
			throw new InvalidJournalEntryParametersError("Invalid entry amount, currencyCode or accounts");
		}

		// Validate the currency code and get the currency obj.
		const currency = this._getCurrencyOrThrow(currencyCode);



		// Check if the debited and credited accounts are the same.
		if (creditedAccountId === debitedAccountId) {
            timerEndFn({success: "false"});
			throw new InvalidJournalEntryParametersError("creditedAccountId and debitedAccountId cannot be the same");
		}

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

        // must use the currencyDecimals defined in the account, as this might have changed after the account creation
        // check that the 2 accounts must have the same decimals setting
        if(creditedAccount.currencyDecimals !== debitedAccount.currencyDecimals){
            const msg = "Incompatible creditedAccountId or debitedAccountId accounts in _createJournalEntry() - have different currencyDecimals configured";
            this._logger.warn(msg);
            timerEndFn({success: "false"});
            throw new InvalidAccountParametersError(msg);
        }

        // Convert the amount to bigint and validate it.
        let amount: bigint;
        try {
            // NOTE: always use the decimals configured in the accounts, currencies can change, accounts cannot
            amount = stringToBigint(amountStr, creditedAccount.currencyDecimals);
        } catch (error: unknown) {
            timerEndFn({success: "false"});
            throw new InvalidJournalEntryParametersError("Invalid entry amount");
        }

		// TODO check limit mode in createEntry

        const builtinLedgerJournalEntry: BuiltinLedgerJournalEntry = {
            ownerId: ownerId,
            currencyCode: currency.code,
            currencyDecimals: currency.decimals,
            pending: pending,
            amount: amount,
            debitedAccountId: debitedAccountId,
            creditedAccountId: creditedAccountId,
            timestamp: timestamp
        };

		// Store the journal entry.
		const entryiId = await this._storeNewJournalEntry(builtinLedgerJournalEntry, inBatch);

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

        timerEndFn({success: "true"});
		return entryiId;

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

		const builtinLedgerAccountDtos: BuiltinLedgerAccountDto[] =
            builtinLedgerAccounts.map(BuiltinLedgerAccountDto.fromBuiltinLedgerAccount);

		return builtinLedgerAccountDtos;
	}

    async getAccountsByOwnerId(secCtx: CallSecurityContext, ownerId: string): Promise<BuiltinLedgerAccountDto[]> {
        //TODO Implement getAccountsByOwnerId in getAccountsByOwnerId
        throw new Error("NOT IMPLEMENTED");
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
				id: builtinLedgerJournalEntry.id || null,
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

    async getJournalEntriesByOwnerId(secCtx: CallSecurityContext, ownerId: string): Promise<BuiltinLedgerJournalEntryDto[]> {
        this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_JOURNAL_ENTRY);
        this._logAction(secCtx, "getJournalEntriesByOwnerId");

        let builtinLedgerJournalEntries: BuiltinLedgerJournalEntry[];
        try {
            builtinLedgerJournalEntries
                = await this._builtinLedgerJournalEntriesRepo.getJournalEntriesByOwnerId(ownerId);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        const builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[]
            = builtinLedgerJournalEntries.map((builtinLedgerJournalEntry) => {
            return {
                id: builtinLedgerJournalEntry.id || null,
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

    private async _checkLiquidAndReserve(
        secCtx: CallSecurityContext,
        req:IAnbCheckLiquidAndReserveRequest,
        inBatch:boolean = false
    ):Promise<boolean>{
        //this._logAction(secCtx, "checkLiquidAndReserve");

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(req.currencyCode);

        // get accounts and their balances from the ledger
        const ledgerAccounts = await this._getAccountsByIds(
            [req.payerPositionAccountId, req.payerLiquidityAccountId]
        );
        const payerPosLedgerAcc = ledgerAccounts.find(value => value.id === req.payerPositionAccountId);
        const payerLiqLedgerAcc = ledgerAccounts.find(value => value.id === req.payerLiquidityAccountId);

        if (!payerPosLedgerAcc || !payerLiqLedgerAcc) {
            const err = new AccountNotFoundError(`Could not find payer accounts in the ledger service for transfer with id: ${req.transferId}`);
            this._logger.warn(err.message);
            throw err;
        }

        // must use the currencyDecimals defined in the account, as this might have changed after the account creation
        // check that the 2 accounts must have the same decimals setting
        if(payerPosLedgerAcc.currencyDecimals !== payerLiqLedgerAcc.currencyDecimals){
            const msg = "Incompatible creditedAccountId or debitedAccountId accounts in checkLiquidAndReserve() - have different currencyDecimals configured";
            this._logger.warn(msg);
            throw new InvalidAccountParametersError(msg);
        }

        // check liquidity -> pos.post.dr + pos.pend.dr - pos.post.cr + trx.amount <= liq.bal - NDC
        const payerHasLiq = this._checkParticipantLiquidity(
            payerPosLedgerAcc, payerLiqLedgerAcc, req.transferAmount,
            req.payerNetDebitCap, payerPosLedgerAcc.currencyDecimals);

        if(!payerHasLiq){
            return false;
            // // TODO audit PayerFailedLiquidityCheckError
            // const err = new PayerFailedLiquidityCheckError("Liquidity check failed");
            // this._logger.warn(err.message);
            // throw err;
        }

        try {
            // TODO can be optimised, some checks above are done again inside _createJournalEntry()
            await this._createJournalEntry(
                req.transferAmount,
                req.currencyCode,
                req.hubJokeAccountId,
                req.payerPositionAccountId,
                Date.now(),
                req.transferId,
                true,
                inBatch
            );
            this._logAction(secCtx, "checkLiquidAndReserve", true);
            return true;
        } catch (error: any) {
            this._logAction(secCtx, "checkLiquidAndReserve", false);
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

    private async _cancelReservationAndCommit(
        secCtx: CallSecurityContext,
        req:IAnbCancelReservationAndCommitRequest,
        inBatch:boolean = false
    ): Promise<void> {
        if (!req.payerPositionAccountId || !req.payeePositionAccountId || !req.hubJokeAccountId) {
            const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservationAndCommit request");
            this._logger.warn(err.message);
            throw err;
        }

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(req.currencyCode);
        const now = Date.now();
        const amount = stringToBigint(req.transferAmount, currency.decimals);
        const revertAmount = amount * -1n;

        try {
            // Cancel/void the reservation (negative amount pending entry)
            await this._createJournalEntry(
                // bigintToString(revertAmount, currency.decimals),
                bigintToString(amount, currency.decimals),
                req.currencyCode,
                req.payerPositionAccountId,
                req.hubJokeAccountId,
                now,
                req.transferId,
                true,
                inBatch
            );

            // Move funds from payer position to payee position (normal entry)
            await this._createJournalEntry(
                bigintToString(amount, currency.decimals),
                req.currencyCode,
                req.payeePositionAccountId,
                req.payerPositionAccountId,
                now,
                req.transferId,
                false,
                inBatch
            );
            this._logAction(secCtx, "cancelReservationAndCommit", true);
        } catch (error: any) {
            this._logAction(secCtx, "cancelReservationAndCommit", false);
            this._logger.error(error);
            throw error;
        }
    }

    private async _cancelReservation(
        secCtx: CallSecurityContext,
        req:IAnbCancelReservationRequest,
        inBatch:boolean = false
    ): Promise<void> {
        if (!req.payerPositionAccountId || !req.hubJokeAccountId) {
            const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservation request");
            this._logger.warn(err.message);
            throw err;
        }

        // Validate the currency code and get the currency.
        const currency = this._getCurrencyOrThrow(req.currencyCode);

        const amount = stringToBigint(req.transferAmount, currency.decimals);
        const revertAmount = amount * -1n;

        try {
            // Cancel/void the reservation (negative amount pending entry)
            await this._createJournalEntry(
                bigintToString(revertAmount, currency.decimals),
                req.currencyCode,
                req.hubJokeAccountId,
                req.payerPositionAccountId,
                Date.now(),
                req.transferId,
                true,
                inBatch
            );
            this._logAction(secCtx, "cancelReservation", true);
        } catch (error: any) {
            this._logAction(secCtx, "cancelReservation", false);
            this._logger.error(error);
            throw error;
        }
    }



}
