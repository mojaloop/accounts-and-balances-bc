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

 * Interledger Foundation
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/

"use strict";

import {randomUUID} from "crypto";
import * as TB from "tigerbeetle-node";
import {CreateTransferError} from "tigerbeetle-node";
import {ILedgerAccount, ILedgerDataPlaneClient} from "../../types";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

import {
    AccountNotFoundError,
    AccountsAndBalancesError,
    AnbHighLevelRequestTypes,
    IAnbAccount,
    IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbCreateJournalEntryRequest,
    IAnbCreateResponse,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse,
    IAnbJournalEntry
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";


import {bigintToString, getCurrencyOrThrow, stringToBigint} from "../../utils";

import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {TigerBeetleUtils} from "./tigerbeetle_utils";

export class TigerBeetleDataPlaneClient implements ILedgerDataPlaneClient {
    protected readonly _logger: ILogger;
    protected readonly _clusterId: bigint;
    protected  readonly _currencies:Currency[];
    protected  readonly _histo: IHistogram;
    protected _replicaAddresses: string[];
    protected _tbClient: TB.Client;
    protected _ready: boolean = false;
    private _readyStateChangedListener: (ready: boolean) => void;

    protected _tbLookupLessMode = false;

    constructor(
        clusterId: number,
        replicaAddresses: string,
        currencies:Currency[],
        logger: ILogger,
        metrics:IMetrics
    ) {
        this._logger = logger.createChild(this.constructor.name);
        // TODO: shouldn't currencies com from the control plane?
        this._currencies = currencies;
        this._clusterId = BigInt(clusterId);
        this._replicaAddresses = replicaAddresses.split(",");

        this._histo = metrics.getHistogram("TigerBeetleDataPlaneClient", "TigerBeetleDataPlaneClient metrics", ["callName", "success"]);
    }

    async init(): Promise<void> {
        this._logger.debug("Init starting..");

        this._replicaAddresses = await TigerBeetleUtils.parseAndLookupReplicaAddresses(this._replicaAddresses, this._logger);

        this._logger.info(`${this.constructor.name}.init() creating client instance to clusterId: ${this._clusterId} and replica addresses: ${this._replicaAddresses}...`);
        this._tbClient = TB.createClient({
            cluster_id: this._clusterId,
            replica_addresses: this._replicaAddresses
        });

        // simple connectivity test
        await this._tbClient.lookupAccounts([0n]);

        // TODO consider a

        this._ready = true;
    }

    async destroy():Promise<void>{
        this._tbClient.destroy();
    }


    setReadyStateChangedListener(listener:(ready:boolean)=>void):void{
        this._readyStateChangedListener = listener;
    }

    isReady(): Promise<boolean> {
        // consider a ping (liveliness check)
        return Promise.resolve(this._ready);
    }

    private _processingHighLevelBatch = false;
    async processHighLevelBatch(requests: IAnbHighLevelRequest[]): Promise<IAnbHighLevelResponse[]> {
        if(this._processingHighLevelBatch){
            // Should never happen, but we don't control how the client is used - this is safer
            throw new Error("Already processing");
        }
        const startTs = Date.now();
        const timerEndFn = this._histo.startTimer({callName: "processHighLevelBatch"});

        this._processingHighLevelBatch = true;
        const responses: IAnbHighLevelResponse[] = [];
        const pendingTbRequests: {reqId:string, tbTransfer:TB.Transfer} [] = [];

        // not used in tbLookupLessMode
        const lookedUpAccounts: TB.Account[] = [];

        if(!this._tbLookupLessMode) {
            // prepare to batch all reads first in one request
            const accountIdsToLookup: bigint[] = [];
            for (const req of requests) {
                if (req.requestType !== AnbHighLevelRequestTypes.checkLiquidAndReserve) continue;

                const specificReq = req as IAnbCheckLiquidAndReserveRequest;
                // TODO: make sure we validate requests before
                const payerPositionAccountId: bigint = TigerBeetleUtils.uuidToBigint(req.payerPositionAccountId);
                if (!accountIdsToLookup.includes(payerPositionAccountId)) accountIdsToLookup.push(payerPositionAccountId);

                const payerLiquidityAccountId: bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerLiquidityAccountId);
                if (!accountIdsToLookup.includes(payerLiquidityAccountId)) accountIdsToLookup.push(payerLiquidityAccountId);
            }

            if (accountIdsToLookup.length > 0) {
                const timerEndFn_lookupAccounts = this._histo.startTimer({callName: "processHighLevelBatch_tb_lookupAccounts"});
                try {
                    const tmpLookedUpAccounts = await this._tbClient.lookupAccounts(accountIdsToLookup);
                    lookedUpAccounts.push(...tmpLookedUpAccounts);
                    timerEndFn_lookupAccounts({success: "true"});
                } catch (error) {
                    timerEndFn({success: "false"});
                    timerEndFn_lookupAccounts({success: "false"});
                    // accounts that don't exist are simply not returned, so errors in here are of technical nature
                    this._logger.error(error, "Error getting accounts from TigerBeetle in processHighLevelBatch");
                    throw new AccountNotFoundError("Error getting accounts from TigerBeetle in processHighLevelBatch");
                }
            }
        }

        // process requests and add them to this._pendingTbRequests
        for (const req of requests) {
            let resp;
            if(req.requestType === AnbHighLevelRequestTypes.checkLiquidAndReserve) {
                resp = await this._getTbTransfersFor_checkLiquidAndReserve(req, lookedUpAccounts);
            }else if(req.requestType === AnbHighLevelRequestTypes.cancelReservationAndCommit){
                resp = await this._getTbTransfersFor_cancelReservationAndCommit(req);
            }else if(req.requestType === AnbHighLevelRequestTypes.cancelReservation){
                resp = await this._getTbTransfersFor_cancelReservation(req);
            }else{
                // this needs to break execution
                throw new AccountsAndBalancesError(`Received unsupported requestType in processHighLevelBatch: '${req.requestType}'`);
            }
            if (resp.success){
                for(const tbTransf of resp.tbTransfs){
                    pendingTbRequests.push({reqId: req.requestId, tbTransfer: tbTransf});
                }
            }
            responses.push({requestId: req.requestId, requestType: req.requestType, success: resp.success, errorMessage: resp.errorMsg || null});
        }

        // send them all in a batch
        let errors: TB.CreateTransfersError[];
        try{
            const tbTransfers = pendingTbRequests.map(value => value.tbTransfer);
            const timerEndFn_transfers = this._histo.startTimer({callName: "processHighLevelBatch_tb_createTransfers"});
            errors = await this._tbClient.createTransfers(tbTransfers);
            timerEndFn_transfers({success: "true"});
        }catch (error) {
            timerEndFn({success: "false"});
            this._processingHighLevelBatch = false;
            this._logger.error(error);
            throw error;
        }

        // handle any errors returned by TB
        if(errors.length <= 0){
            timerEndFn({success: "true"});
        }else {
            for (let i = 0; i < errors.length; i++){
                const error = errors[i];
                if(error.result==CreateTransferError.ok || error.result==CreateTransferError.linked_event_failed) continue;

                const resp = responses.find(value => value.requestId === pendingTbRequests[i].reqId);
                if(!resp) throw new AccountNotFoundError("Error creating transfers, could not find original request matching a TB error response");

                if(error.result === TB.CreateTransferError.exceeds_credits){
                    resp.success = false;
                    resp.errorMessage = "";
                }else{
                    // any other error is considered an exception
                    const errMessage = `HighLevel request with id: ${resp.requestId} failed in TigerBeetle with error code: ${error.result} `;
                    this._logger.warn(errMessage);
                    throw new AccountsAndBalancesError( errMessage)
                }
            }
            timerEndFn({success: "false"});
        }

        this._processingHighLevelBatch = false;
        this._logger.isDebugEnabled() && this._logger.debug(`processHighLevelBatch took ${Date.now()-startTs} ms to process a batch of: ${requests.length} requests`);
        return responses;
    }

    protected _validateCommonFieldsInHighLevelRequestOrThrow(req:IAnbHighLevelRequest, currency: Currency){
        this._checkValidAccountIdOrThrow(req.payerPositionAccountId, "Invalid payerPositionAccountId in checkLiquidAndReserve IAnbHighLevelRequest");
        this._checkValidAccountIdOrThrow(req.hubJokeAccountId, "Invalid hubJokeAccountId in checkLiquidAndReserve IAnbHighLevelRequest");

        if (!currency || !currency.code) {
            throw new AccountNotFoundError("Invalid currencyCode on IAnbHighLevelRequest request");
        }
        if (currency.num === undefined || currency.num === null) {
            throw new AccountNotFoundError("Invalid currencyDecimals on IAnbHighLevelRequest request");
        }
        if (currency.decimals === undefined || currency.decimals === null) {
            throw new AccountNotFoundError("Invalid currencyDecimals on IAnbHighLevelRequest request");
        }
        if (!req.transferAmount) {
            throw new AccountNotFoundError("Invalid transferAmount on IAnbHighLevelRequest request");
        }
        if (req.transferId === undefined || req.transferId === null) {
            throw new AccountsAndBalancesError("Invalid transferId on IAnbHighLevelRequest request");
        }
    }

    protected async _getTbTransfersFor_checkLiquidAndReserve(req:IAnbHighLevelRequest, tmpAccounts:TB.Account[]):Promise<{tbTransfs:TB.Transfer[], success:boolean, errorMsg?:string}>{
        const timerEndFn = this._histo.startTimer({callName: "_getTbTransfersFor_checkLiquidAndReserve"});
        const specificReq = req as IAnbCheckLiquidAndReserveRequest;

        // get currency
        const currency = getCurrencyOrThrow(this._currencies, specificReq.currencyCode);
        // common checks
        this._validateCommonFieldsInHighLevelRequestOrThrow(specificReq, currency);
        // specific checks
        this._checkValidAccountIdOrThrow(specificReq.payerLiquidityAccountId, "Invalid payerLiquidityAccountId in checkLiquidAndReserve IAnbHighLevelRequest");
        if(specificReq.payerNetDebitCap === undefined || specificReq.payerNetDebitCap === null) {
            timerEndFn({success: "false"});
            return {tbTransfs:[], success: false, errorMsg: "Invalid payerNetDebitCap in checkLiquidAndReserve IAnbHighLevelRequest"};
        }

        const transferId = TigerBeetleUtils.uuidToBigint(specificReq.transferId);
        const amount = stringToBigint(specificReq.transferAmount, currency.decimals);
        const payerNetDebitCap = stringToBigint(specificReq.payerNetDebitCap, currency.decimals);
        const ledgerId = parseInt(currency.num);
        const payerPositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerPositionAccountId);
        const payerLiquidityAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerLiquidityAccountId); // was checked above
        const hubJokeAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.hubJokeAccountId);

        // tb accounts with balance where pre-fetched before
        const payerPosTbAcc = tmpAccounts.find(value => value.id === payerPositionAccountId);
        const payerLiqTbAcc = tmpAccounts.find(value => value.id === payerLiquidityAccountId);

        if(!payerPosTbAcc || ! payerLiqTbAcc){
            timerEndFn({success: "false"});
            this._logger.warn(`Could not find payer accounts in TigerBeetle for transfer with Id: ${specificReq.transferId}`);
            return {tbTransfs:[], success: false, errorMsg: `Could not find payer accounts in TigerBeetle for transfer with Id: ${specificReq.transferId}`};
        }

        // account balances were read (lookup) before this call, passed on the tmpAccounts param
        if(!this._checkParticipantLiquidity(payerPosTbAcc, payerLiqTbAcc, amount, payerNetDebitCap)){
            timerEndFn({success: "false"});
            return {tbTransfs:[], success: false, errorMsg: "Payer liquidity check failed"};
        }

        const tbTransfs:TB.Transfer[] = [{
            id: TigerBeetleUtils.uuidToBigint(randomUUID()), // u128
            debit_account_id: payerPositionAccountId,  // u128
            credit_account_id: hubJokeAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.pending, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        }];

        timerEndFn({success: "true"});
        return {tbTransfs: tbTransfs, success: true};
    }

    protected async _getTbTransfersFor_cancelReservationAndCommit(req:IAnbHighLevelRequest):Promise<{tbTransfs:TB.Transfer[], success:boolean, errorMsg?:string}>{
        const timerEndFn = this._histo.startTimer({callName: "_getTbTransfersFor_cancelReservationAndCommit"});
        const specificReq = req as IAnbCancelReservationAndCommitRequest;

        // get currency
        const currency = getCurrencyOrThrow(this._currencies, specificReq.currencyCode);
        // common checks
        this._validateCommonFieldsInHighLevelRequestOrThrow(specificReq, currency);
        // specific checks
        if(specificReq.payeePositionAccountId === undefined || specificReq.payeePositionAccountId === null) {
            throw new AccountsAndBalancesError("Invalid payeePositionAccountId in cancelReservationAndCommit IAnbHighLevelRequest");
        }

        // first in the chain, dont' care about its id
        const cancelTransferId  = TigerBeetleUtils.uuidToBigint(randomUUID());
        // this is the last in the chain, so it gets the requestI
        const commitTransferId  =  TigerBeetleUtils.uuidToBigint(randomUUID());
        const transferId = TigerBeetleUtils.uuidToBigint(specificReq.transferId);
        const amount = stringToBigint(specificReq.transferAmount, currency.decimals);
        const ledgerId = parseInt(currency.num);
        const payerPositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerPositionAccountId);
        const payeePositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payeePositionAccountId);
        const hubJokeAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.hubJokeAccountId);

        /*
        - Cancel the pending and commit from payer to payee (linked)
        - Should use the pending_id to void the reservation, and do only one tb transfer, but first we need
          to store that reservation transfer id with the transfer record in the TransfersBC (maybe use the
          transferId for the id of the 1st tb transfer)
        */
        const tbTransfs:TB.Transfer[] = [{
            id: cancelTransferId,
            debit_account_id: hubJokeAccountId,  // u128
            credit_account_id: payerPositionAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.pending | TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            id: commitTransferId,
            debit_account_id: payerPositionAccountId,  // u128
            credit_account_id: payeePositionAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.none, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        }];

        timerEndFn({success: "true"});
        return {tbTransfs: tbTransfs, success: true};
    }

    protected async _getTbTransfersFor_cancelReservation(req:IAnbHighLevelRequest):Promise<{tbTransfs:TB.Transfer[], success:boolean, errorMsg?:string}>{
        const timerEndFn = this._histo.startTimer({callName: "_getTbTransfersFor_cancelReservation"});
        // get currency
        const currency = getCurrencyOrThrow(this._currencies, req.currencyCode);
        // common checks
        this._validateCommonFieldsInHighLevelRequestOrThrow(req, currency);
        // no specific checks

        const cancelTransferId  = TigerBeetleUtils.uuidToBigint(randomUUID());
        const transferId = TigerBeetleUtils.uuidToBigint(req.transferId);
        const amount = stringToBigint(req.transferAmount, currency.decimals);
        const ledgerId = parseInt(currency.num);
        const payerPositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(req.payerPositionAccountId);
        const hubJokeAccountId:bigint = TigerBeetleUtils.uuidToBigint(req.hubJokeAccountId);

        const cancelTbTransfer: TB.Transfer = {
            id: cancelTransferId,
            debit_account_id: hubJokeAccountId,  // u128
            credit_account_id: payerPositionAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.pending | TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        };

        timerEndFn({success: "true"});
        return {tbTransfs: [cancelTbTransfer], success: true};
    }

    async createJournalEntries(entryCreates: IAnbCreateJournalEntryRequest[]): Promise<IAnbCreateResponse[]> {
        const timerEndFn = this._histo.startTimer({callName: "createJournalEntries"});
        const startTs = Date.now();

        const responses:IAnbCreateResponse[] = [];
        const pendingTbRequests: {reqId:string, tbTransfer:TB.Transfer} [] = [];

        // validate entries and create tb transfer structs
        entryCreates.forEach(entry => {
            // validations
            this._checkValidAccountIdOrThrow(entry.debitedAccountId, "Invalid debitedAccountId in createJournalEntries");
            this._checkValidAccountIdOrThrow(entry.creditedAccountId, "Invalid creditedAccountId in createJournalEntries");

            const currency = getCurrencyOrThrow(this._currencies, entry.currencyCode);
            if (!currency || !currency.code) {
                throw new AccountNotFoundError("Invalid currencyCode on IAnbHighLevelRequest request");
            }
            if (currency.num === undefined || currency.num === null) {
                throw new AccountNotFoundError("Invalid currencyDecimals on IAnbHighLevelRequest request");
            }
            if (currency.decimals === undefined || currency.decimals === null) {
                throw new AccountNotFoundError("Invalid currencyDecimals on IAnbHighLevelRequest request");
            }
            if (!entry.amount) {
                throw new AccountNotFoundError("Invalid transferAmount on IAnbHighLevelRequest request");
            }

            const reqId = entry.requestedId || randomUUID();
            responses.push({ requestedId: entry.requestedId, attributedId: reqId });

            pendingTbRequests.push({
                reqId: reqId,
                tbTransfer: {
                    id: TigerBeetleUtils.uuidToBigint(reqId),
                    debit_account_id: entry.pending ? 0n : TigerBeetleUtils.uuidToBigint(entry.debitedAccountId),
                    credit_account_id: entry.pending ? 0n : TigerBeetleUtils.uuidToBigint(entry.creditedAccountId),
                    amount: stringToBigint(entry.amount, currency.decimals),
                    pending_id: 0n, // u128
                    user_data_128: entry.ownerId ? TigerBeetleUtils.uuidToBigint(entry.ownerId) : 0n,
                    user_data_64: 0n,
                    user_data_32: 0,
                    timeout: 0, // u64, in nano-seconds.
                    ledger: parseInt(currency.num),  // u32, ledger for transfer (e.g. currency).
                    code: 1,  // u16, //TODO confirm
                    flags: entry.pending ? TB.TransferFlags.pending : TB.TransferFlags.none,
                    timestamp: 0n, //u64, Reserved: This will be set by the server.
                }
            });
        });

        // send them all in a batch and handle errors
        let errors: TB.CreateTransfersError[];
        try{
            const tbTransfers = pendingTbRequests.map(value => value.tbTransfer);
            const timerEndFn_transfers = this._histo.startTimer({callName: "createJournalEntries_tb_createTransfers"});
            errors = await this._tbClient.createTransfers(tbTransfers);
            timerEndFn_transfers({success: "true"});
        }catch (error) {
            timerEndFn({success: "false"});
            this._processingHighLevelBatch = false;
            this._logger.error(error);
            throw error;
        }

        // handle any errors returned by TB
        if(errors.length <= 0){
            timerEndFn({success: "true"});
        }else {
            for(const error of errors){
                if(error.result==CreateTransferError.ok) continue;
                this._logger.warn(`Create entry with requestedId: ${responses[error.index].requestedId} failed in TigerBeetle with error code: ${error.result} `);
            }
            timerEndFn({success: "false"});
        }

        this._processingHighLevelBatch = false;
        this._logger.isDebugEnabled() && this._logger.debug(`createJournalEntries took ${Date.now()-startTs} ms to process a batch of: ${entryCreates.length} entries`);
        return responses;
    }

    async getAccountsByIds(accountIds: string[]): Promise<ILedgerAccount[]> {
        const timerEndFn = this._histo.startTimer({callName: "getAccountsByIds"});

        try {
            const tbLookups: TB.AccountID[] = accountIds.map(TigerBeetleUtils.uuidToBigint);
            const tbResp = await this._tbClient.lookupAccounts(tbLookups);

            if(!tbResp || tbResp.length <=0 ) {
                timerEndFn({success: "true"});
                return [];
            }

            const resp:ILedgerAccount[] = [];
            for(const tbAcc of tbResp){
                const currencyCode = TigerBeetleUtils.currencyCodeFromLedgerNum(tbAcc.ledger, this._currencies);
                const currency = this._currencies.find(value => value.code === currencyCode);
                if(!currencyCode || !currency){
                    throw new Error(`Invalid ledger (currency) found in TigerBeetle account with id: ${tbAcc.id}`);
                }

                const balance = tbAcc.credits_posted - tbAcc.debits_posted;

                resp.push({
                    id: TigerBeetleUtils.bigIntToUuid(tbAcc.id),
                    currencyCode: currencyCode,
                    postedDebitBalance: bigintToString(tbAcc.debits_posted, currency.decimals),
                    pendingDebitBalance: bigintToString(tbAcc.debits_pending, currency.decimals),
                    postedCreditBalance: bigintToString(tbAcc.credits_posted, currency.decimals),
                    pendingCreditBalance: bigintToString(tbAcc.credits_pending, currency.decimals),
                    timestampLastJournalEntry: Number(tbAcc.timestamp),
                    balance: bigintToString(balance, currency.decimals)
                });
            }
            return resp;
        }catch (error) {
            timerEndFn({success: "false"});
            if(error instanceof Error) {
                this._logger.error(error,`Unable to getAccountsByIds from TigerBeetle - ${error.message}`);
                throw error;
            }
            this._logger.error(`Unable to getAccountsByIds from TigerBeetle - ${error}`);
            throw new Error(Object(error).toString());
        }

    }

    /*
   * Not yet implemented methods
   * */
    getJournalEntriesByAccountId(accountId: string): Promise<IAnbJournalEntry[]> {
        throw new Error("Method not implemented.");
    }

    getAccountsByOwnerIds(ownerIds: string[]): Promise<IAnbAccount[]> {
        throw new Error("Method not implemented.");
    }

    getJournalEntriesByOwnerId(ownerId: string): Promise<IAnbJournalEntry[]> {
        throw new Error("Method not implemented.");
    }

    // getJournalEntriesByOwnerId(ownerId: string): Promise<IAnbJournalEntry[]>{
    //     throw new Error("Method not implemented.");
    // }


    /*
    * Other private helpers
    * */

    protected _checkValidAccountIdOrThrow(accountId:string|null, errorMessage:string){
        if(accountId === undefined || accountId === null) {
            throw new AccountsAndBalancesError(errorMessage);
        }
    }

    protected _checkParticipantLiquidity(
        payerPos:TB.Account, payerLiq:TB.Account,
        trxAmount:bigint, payerNdc:bigint
    ):boolean{
        const positionPostDr = payerPos.debits_posted;
        const positionPendDr = payerPos.debits_pending;
        const positionPostCr = payerPos.credits_posted;

        const liquidityPostDr = payerLiq.debits_posted;
        const liquidityPostCr = payerLiq.credits_posted;

        // check all balances are valid
        if(!this._checkPositiveNumber(positionPostDr) || !this._checkPositiveNumber(positionPendDr)
            || !this._checkPositiveNumber(positionPostCr) || !this._checkPositiveNumber(liquidityPostDr)
            || !this._checkPositiveNumber(liquidityPostCr)){
            this._logger.warn("Invalid balance (not number or less than zero) in _checkParticipantLiquidity");
            return false;
        }

        const liquidityBal = liquidityPostCr - liquidityPostDr;

        return positionPostDr + positionPendDr - positionPostCr + trxAmount <= liquidityBal - payerNdc;
    }

    protected _checkPositiveNumber(num: bigint): boolean{
        return num!=null || num!=undefined || num>=0n;
    }
}
