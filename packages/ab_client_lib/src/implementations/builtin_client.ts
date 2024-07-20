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

import * as grpc from "@grpc/grpc-js";
import {dirname, join} from "path";
import * as protoLoader from "@grpc/proto-loader";
import {ConnectivityState} from "@grpc/grpc-js/build/src/connectivity-state";

import {ILedgerAccount, ILedgerDataPlaneClient} from "../types";
import type {
    ProtoGrpcType as DataPlaneProtoGrpcType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/builtin_ledger";
import {
    GrpcBuiltinLedgerServiceClient
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedgerService";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    AccountsAndBalancesError, AnbHighLevelRequestTypes,
    GRPC_LOAD_PROTO_OPTIONS, GRPC_METADATA_TOKEN_FIELD_KEY,
    IAnbAccount,
    IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbCreateJournalEntryRequest,
    IAnbCreateResponse,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse,
    IAnbJournalEntry,
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

import {ILoginHelper} from "@mojaloop/security-bc-public-types-lib";


import {
    GrpcBuiltinLedger_HighLevelRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_HighLevelRequest";
import {
    GrpcBuiltinLedger_CheckLiquidAndReserveRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_CheckLiquidAndReserveRequest";
import {
    GrpcBuiltinLedger_CancelReservationAndCommitRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_CancelReservationAndCommitRequest";
import {
    GrpcBuiltinLedger_CancelReservationRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_CancelReservationRequest";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
    GrpcBuiltinLedger_JournalEntryList__Output,
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_JournalEntryList";
import {
    GrpcBuiltinLedger_JournalEntry__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_JournalEntry";
import {
    GrpcBuiltinLedger_HighLevelRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_HighLevelRequestList";
import {
    GrpcControlPlane_Id
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_Id";
import {
    GrpcBuiltinLedger_AccountList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_AccountList";

import {
    GrpcBuiltinLedger_Account__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_Account";


const PUBLIC_TYPES_LIB_PATH = require.resolve("@mojaloop/accounts-and-balances-bc-public-types-lib");
const PROTO_FILE_NAME = "builtin_ledger.proto";

const DEFAULT_GRPC_CONNECT_TIMEOUT_MS = 5_000;

export class BuiltinLedgerDataPlaneClient implements ILedgerDataPlaneClient {
    private readonly _logger: ILogger;
    private readonly _grpcServiceUrl: string;
    private readonly _grpcConnectTimeOutMs: number;
    private readonly _loginHelper:ILoginHelper;
    private readonly _callMetadata: grpc.Metadata;
    private readonly _histo: IHistogram;
    private _dataPlaneProto: DataPlaneProtoGrpcType;
    private _dataPlaneClient: GrpcBuiltinLedgerServiceClient;
    private _ready: boolean = false;
    private _readyStateChangedListener:(ready:boolean)=>void;

    constructor(
        grpcServiceUrl: string, logger: ILogger, loginHelper: ILoginHelper,
        metrics:IMetrics, grpcConnectTimeOutMs: number = DEFAULT_GRPC_CONNECT_TIMEOUT_MS
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._grpcServiceUrl = grpcServiceUrl;
        this._loginHelper = loginHelper;
        this._grpcConnectTimeOutMs = grpcConnectTimeOutMs;

        const protoFilePath = join(dirname(PUBLIC_TYPES_LIB_PATH), "/proto/", PROTO_FILE_NAME);

        const dataPlanePackageDefinition = protoLoader.loadSync(protoFilePath, GRPC_LOAD_PROTO_OPTIONS);
        this._dataPlaneProto = grpc.loadPackageDefinition(dataPlanePackageDefinition) as unknown as DataPlaneProtoGrpcType;

        this._callMetadata = new grpc.Metadata();

        // instantiate grpc client
        this._dataPlaneClient = new this._dataPlaneProto.aandb.builtinledger.GrpcBuiltinLedgerService(
            this._grpcServiceUrl,
            grpc.credentials.createInsecure()
        );

        this._histo = metrics.getHistogram("BuiltinLedgerDataPlaneClient", "BuiltinLedgerDataPlaneClient metrics", ["callName", "success"]);
        this._logger.info(`${this.constructor.name} instantiated with builtinLedger in url: ${this._grpcServiceUrl}`);
    }

    isReady(): Promise<boolean> {
        // consider a ping (liveliness check)
        return Promise.resolve(this._ready);
    }

    async init(): Promise<void> {
        this._ready = false;
        // we don't use credentials here, but want to try fetching a token to fail early
        await this._updateCallMetadata();

        return new Promise((resolve, reject) => {
            const deadline: grpc.Deadline = Date.now() + this._grpcConnectTimeOutMs;
            this._dataPlaneClient.waitForReady(deadline, (error?:Error) => {
                if (error)
                    return reject(error);

                const channelzRf = this._dataPlaneClient.getChannel().getChannelzRef();

                const channel =this._dataPlaneClient.getChannel();
                let currentState: ConnectivityState, lastState: ConnectivityState;
                currentState = lastState = channel.getConnectivityState(false);

                const updateLoop = ()=>{
                    if(lastState !== ConnectivityState.READY && lastState !== ConnectivityState.CONNECTING) {
                        channel.getConnectivityState(true);
                    }

                    channel.watchConnectivityState(lastState, Date.now() + this._grpcConnectTimeOutMs, (error1) => {
                        // error here are only a timeout, means nothing changed after the this._grpcConnectTimeOutMs passed
                        if (error) return setImmediate(updateLoop);

                        currentState = channel.getConnectivityState(false);
                        if (currentState === lastState){
                            return setImmediate(updateLoop);
                        }

                        this._logger.info(`${this.constructor.name} channel state changed - last state: ${ConnectivityState[lastState]} -> new state: ${ConnectivityState[currentState]}`);
                        lastState = currentState;

                        this._notifyReadyStateChanged(currentState === ConnectivityState.READY || currentState === ConnectivityState.IDLE);

                        return setImmediate(updateLoop);
                    });
                };

                // start the update loop
                setTimeout(updateLoop, 10);

                this._ready = true;
                this._logger.info(`${this.constructor.name} initialized 🚀 - channel: ${channelzRf.name}`);
                return resolve();
            });
        });
    }

    private async _updateCallMetadata(accessToken?:string): Promise<void> {
        const timerEndFn = this._histo.startTimer({callName: "updateCallMetadata"});

        if(!accessToken) {
            // this can throw and UnauthorizedError, let it
            const token = await this._loginHelper.getToken();
            accessToken = token.accessToken;
        }
        this._callMetadata.set(GRPC_METADATA_TOKEN_FIELD_KEY, accessToken);

        timerEndFn({success: "true"});
        return Promise.resolve();
    }

    private _notifyReadyStateChanged(ready:boolean):void{
        this._ready = ready;
        if (this._readyStateChangedListener) {
            this._readyStateChangedListener(ready);
        }
    }

    setReadyStateChangedListener(listener:(ready:boolean)=>void):void{
        this._readyStateChangedListener = listener;
    }

    async destroy():Promise<void>{
        if (!this._dataPlaneClient) return;

        const channel = this._dataPlaneClient.getChannel();
        if (channel) channel.close();
    }

    async processHighLevelBatch(requests: IAnbHighLevelRequest[], accessToken?:string): Promise<IAnbHighLevelResponse[]> {
        const timerEndFn = this._histo.startTimer({callName: "processHighLevelBatch"});
        const startTs = Date.now();

        await this._updateCallMetadata(accessToken);
        const metadataTook = Date.now()-startTs;

        const reqArray:GrpcBuiltinLedger_HighLevelRequest[] = [];

        requests.forEach(req =>{
            const parentGrpcReq:GrpcBuiltinLedger_HighLevelRequest = {};
            const commonGrpcReq: GrpcBuiltinLedger_CheckLiquidAndReserveRequest
                | GrpcBuiltinLedger_CancelReservationAndCommitRequest
                | GrpcBuiltinLedger_CancelReservationRequest = {};

            // common fields
            commonGrpcReq.requestId = req.requestId;
            commonGrpcReq.transferId = req.transferId;
            commonGrpcReq.transferAmount = req.transferAmount;
            commonGrpcReq.currencyCode = req.currencyCode;
            commonGrpcReq.payerPositionAccountId = req.payerPositionAccountId;
            commonGrpcReq.hubJokeAccountId = req.hubJokeAccountId;

            if(req.requestType === AnbHighLevelRequestTypes.checkLiquidAndReserve) {
                const specificReq = req as IAnbCheckLiquidAndReserveRequest;
                // specific checks
                if(specificReq.payerLiquidityAccountId === undefined || specificReq.payerLiquidityAccountId === null) {
                    throw new AccountsAndBalancesError("Invalid payerLiquidityAccountId in checkLiquidAndReserve IAccountsBalancesHighLevelRequest");
                }
                if(specificReq.payerNetDebitCap === undefined || specificReq.payerNetDebitCap === null) {
                    throw new AccountsAndBalancesError("Invalid payerNetDebitCap in checkLiquidAndReserve IAccountsBalancesHighLevelRequest");
                }
                const specificGrpcReq:GrpcBuiltinLedger_CheckLiquidAndReserveRequest = commonGrpcReq;
                specificGrpcReq.payerLiquidityAccountId = specificReq.payerLiquidityAccountId || undefined;
                specificGrpcReq.payerNetDebitCap = specificReq.payerNetDebitCap || undefined;
                parentGrpcReq.checkLiquidityAndReserve = specificGrpcReq;
            }else if(req.requestType === AnbHighLevelRequestTypes.cancelReservationAndCommit){
                const specificReq = req as IAnbCancelReservationAndCommitRequest;
                // specific checks
                if(specificReq.payeePositionAccountId === undefined || specificReq.payeePositionAccountId === null) {
                    throw new AccountsAndBalancesError("Invalid payeePositionAccountId in cancelReservationAndCommit IAccountsBalancesHighLevelRequest");
                }
                const specificGrpcReq:GrpcBuiltinLedger_CancelReservationAndCommitRequest = commonGrpcReq;
                specificGrpcReq.payeePositionAccountId = specificReq.payeePositionAccountId;
                parentGrpcReq.cancelReservationAndCommit = specificGrpcReq;
            }else if(req.requestType === AnbHighLevelRequestTypes.cancelReservation){
                // const specificReq = req as IAnbCancelReservationRequest;
                // this request has no specific fields
                parentGrpcReq.cancelReservation = commonGrpcReq;
            }else{
                throw new AccountsAndBalancesError("Received invalid requestType in processHighLevelBatch");
            }

            reqArray.push(parentGrpcReq);
        });

        const grpcRequestArray:GrpcBuiltinLedger_HighLevelRequestList = {
            requestArray: reqArray
        };

        return new Promise((resolve, reject) => {

            const timerEndFn_ledger = this._histo.startTimer({callName: "processHighLevelBatch_ledger_processHighLevelBatch"});
            this._dataPlaneClient.processHighLevelBatch(grpcRequestArray, this._callMetadata,(error, grpcResponse)=>{
                if (error) {
                    timerEndFn_ledger({success: "false"});
                    return reject(error);
                }
                if(!grpcResponse || !grpcResponse.responses) {
                    timerEndFn_ledger({success: "false"});
                    return reject(new Error("invalid response on processHighLevelBatch"));
                }
                timerEndFn_ledger({success: "true"});

                const responses:IAnbHighLevelResponse[] = [];
                grpcResponse.responses.forEach((item)=>{
                    if(!item.requestId ||(
                        item.requestType !== AnbHighLevelRequestTypes.checkLiquidAndReserve &&
                        item.requestType !== AnbHighLevelRequestTypes.cancelReservationAndCommit &&
                        item.requestType !== AnbHighLevelRequestTypes.cancelReservation
                    )) {
                        const error = new Error("invalid response on processHighLevelBatch - item does not contain requestId or requestType");
                        this._logger.error(error);
                        this._logger.isDebugEnabled() && this._logger.debug(JSON.stringify(item, null, 2));
                        return reject(error);
                    }

                    responses.push({
                        requestType: item.requestType as AnbHighLevelRequestTypes,
                        requestId: item.requestId,
                        success: item.success || false,
                        errorMessage: item.errorMessage || null
                    });
                });

                this._logger.isDebugEnabled() && this._logger.debug(`processHighLevelBatch took ${Date.now()-startTs} ms to process a batch of: ${requests.length} requests - metadata took: ${metadataTook}`);
                timerEndFn({success: "true"});
                return resolve(responses);
            });
        });

    }


    async createJournalEntries(entryCreates: IAnbCreateJournalEntryRequest[], accessToken?:string): Promise<IAnbCreateResponse[]> {
        await this._updateCallMetadata(accessToken);
        throw new Error("Method not implemented.");
    }

    async getAccountsByIds(accountIds: string[], accessToken?:string): Promise<ILedgerAccount[]> {
        await this._updateCallMetadata(accessToken);

        const ids:GrpcControlPlane_Id[] = accountIds.map(value => {
            return {id: value};
        });

        return new Promise( (resolve, reject) => {
            this._dataPlaneClient.GetAccountsByIds(
                {ids: ids},
                this._callMetadata,
                (error:grpc.ServiceError|null, resp?:GrpcBuiltinLedger_AccountList__Output
                ) => {
                    if (error || !resp) return reject(error);
                    if (!resp.accounts || resp.accounts.length <= 0) return resolve([]);

                    const accounts: ILedgerAccount[] = this._processGetAccountsResponse(resp.accounts);
                    resolve(accounts);
                });
        });
    }
    async getAccountsByOwnerIds(ownerIds: string[], accessToken?:string): Promise<IAnbAccount[]> {
        await this._updateCallMetadata(accessToken);
        throw new Error("Method not implemented.");
    }

    private _processGetAccountsResponse(grpcAccounts:GrpcBuiltinLedger_Account__Output[]):ILedgerAccount[]{
        const accounts: ILedgerAccount[] = grpcAccounts.map(ledgerAccount =>{
            if (
                !ledgerAccount.id
                || !ledgerAccount.currencyCode
                || !ledgerAccount.postedDebitBalance
                || !ledgerAccount.postedCreditBalance
                || !ledgerAccount.pendingDebitBalance
                || !ledgerAccount.pendingCreditBalance
                || !ledgerAccount.balance
            ) {
                throw new AccountsAndBalancesError("Invalid entry in _processGetAccountsResponse"); // TODO: create custom error.
            }

            return{
                id: ledgerAccount.id,
                currencyCode: ledgerAccount.id,
                postedDebitBalance: ledgerAccount.postedDebitBalance,
                postedCreditBalance: ledgerAccount.postedCreditBalance,
                pendingDebitBalance: ledgerAccount.pendingDebitBalance,
                pendingCreditBalance: ledgerAccount.pendingCreditBalance,
                balance: ledgerAccount.balance,
                timestampLastJournalEntry: ledgerAccount.timestampLastJournalEntry || null
            };
        });

        return accounts;
    }


    private _processGetEntriesResponse(grpcEntries:GrpcBuiltinLedger_JournalEntry__Output[]):IAnbJournalEntry[]{
        const journalEntries: IAnbJournalEntry[] =
            grpcEntries.map((grpcJournalEntryOutput:GrpcBuiltinLedger_JournalEntry__Output) => {
                if (
                    !grpcJournalEntryOutput.id
                    || !grpcJournalEntryOutput.currencyCode
                    || !grpcJournalEntryOutput.amount
                    || !grpcJournalEntryOutput.debitedAccountId
                    || !grpcJournalEntryOutput.creditedAccountId
                    || !grpcJournalEntryOutput.timestamp
                ) {
                    throw new AccountsAndBalancesError("Invalid entry in _processGetEntriesResponse"); // TODO: create custom error.
                }

                const journalEntry: IAnbJournalEntry = {
                    id: grpcJournalEntryOutput.id,
                    ownerId: grpcJournalEntryOutput.ownerId ?? null,
                    currencyCode: grpcJournalEntryOutput.currencyCode,
                    amount: grpcJournalEntryOutput.amount,
                    pending: grpcJournalEntryOutput.pending!,
                    debitedAccountId: grpcJournalEntryOutput.debitedAccountId,
                    creditedAccountId: grpcJournalEntryOutput.creditedAccountId,
                    timestamp: grpcJournalEntryOutput.timestamp
                };
                return journalEntry;
            });
        return journalEntries;
    }

    async getJournalEntriesByAccountId(accountId: string, accessToken?:string): Promise<IAnbJournalEntry[]> {
        await this._updateCallMetadata(accessToken);

        return new Promise( (resolve, reject) => {
            this._dataPlaneClient.getEntriesByAccountId(
                {id: accountId},
                this._callMetadata,
                (error:grpc.ServiceError|null, resp?:GrpcBuiltinLedger_JournalEntryList__Output
            ) => {
                if (error || !resp) return reject(error);
                if (!resp.entries || resp.entries.length <= 0) return resolve([]);

                const journalEntries: IAnbJournalEntry[] = this._processGetEntriesResponse(resp.entries);
                resolve(journalEntries);
            });
        });
    }

    async getJournalEntriesByOwnerId(ownerId: string, accessToken?:string): Promise<IAnbJournalEntry[]> {
        await this._updateCallMetadata(accessToken);

        throw new Error("Not implemented");
        // TODO get account ids by ownerId then call the data plane

        /*return new Promise( (resolve, reject) => {
            this._dataPlaneClient.getEntriesByOwnerId(
                {id: ownerId},
                this._callMetadata,
                (error:grpc.ServiceError|null, resp?:GrpcBuiltinLedger_JournalEntryList__Output
                ) => {
                    if (error || !resp) return reject(error);
                    if (!resp.entries || resp.entries.length <= 0) return resolve([]);

                    const journalEntries: IAnbJournalEntry[] = this._processGetEntriesResponse(resp.entries);
                    resolve(journalEntries);
                });
        });*/
    }

}
