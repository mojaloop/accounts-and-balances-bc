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

import fs from "fs";
import {dirname, join} from "path";
import * as grpc from "@grpc/grpc-js";
import {sendUnaryData, Server, ServerCredentials, ServerErrorResponse, ServerUnaryCall, status} from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {IGauge, IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {BuiltinLedgerAggregate} from "../../domain/aggregate";
import {CallSecurityContext, ForbiddenError, UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {BuiltinLedgerAccountDto, BuiltinLedgerJournalEntryDto, CreatedIdMapResponse} from "../../domain";

import {
    AccountNotFoundError,
    AccountsAndBalancesError,
    AnbAccountType,
    AnbHighLevelRequestTypes,
    GRPC_LOAD_PROTO_OPTIONS,
    GRPC_METADATA_TOKEN_FIELD_KEY,
    IAnbCancelReservationAndCommitRequest,
    IAnbCancelReservationRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbGrpcCertificatesFiles,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import type {ProtoGrpcType} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/builtin_ledger";
import {
    GrpcBuiltinLedgerServiceHandlers
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedgerService";

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

import {
    GrpcBuiltinLedger_Id
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_Id";

import {
    GrpcBuiltinLedger_Account__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_Account";

import {
    GrpcBuiltinLedger_JournalEntry__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_JournalEntry";
import {Empty} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/google/protobuf/Empty";
import {ServerMethodDefinition} from "@grpc/grpc-js/build/src/make-client";
import {ServerInterceptingCall, ServerInterceptingCallInterface} from "@grpc/grpc-js/build/src/server-interceptors";

import {
    GrpcBuiltinLedger_HighLevelResponseList,
    GrpcBuiltinLedger_HighLevelResponseList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_HighLevelResponseList";
import {
    GrpcControlPlane_CreateAccountsResponseList,
    GrpcControlPlane_CreateAccountsResponseList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsResponseList";
import {
    GrpcBuiltinLedger_AccountList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_AccountList";
import {
    GrpcBuiltinLedger_JournalEntryList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_JournalEntryList";
import {
    GrpcControlPlane_CreateAccountsRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsRequestList";
import {
    GrpcControlPlane_IdList, GrpcControlPlane_IdList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_IdList";
import {
    GrpcBuiltinLedger_CreateJournalEntryRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_CreateJournalEntryRequestList";
import {
    GrpcBuiltinLedger_IdList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_IdList";
import {
    GrpcBuiltinLedger_HighLevelRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedger_HighLevelRequestList";


const PUBLIC_TYPES_LIB_PATH = require.resolve("@mojaloop/accounts-and-balances-bc-public-types-lib");
const PROTO_FILE_NAME = "builtin_ledger.proto";
const UNKNOWN_ERROR_MESSAGE = "unknown error";

export class BuiltinLedgerGrpcServer {
    private readonly _logger: ILogger;
    private readonly _url: string;
    private readonly _server: Server;
    private readonly _tokenHelper: TokenHelper;
    private readonly _aggregate: BuiltinLedgerAggregate;
    private readonly _histo: IHistogram;
    private readonly _batchSizeGauge: IGauge;
    private readonly _certFiles: IAnbGrpcCertificatesFiles | undefined = undefined;
    private readonly _credentials: ServerCredentials;

    constructor(
        logger: ILogger,
        tokenHelper: TokenHelper,
        metrics: IMetrics,
        aggregate: BuiltinLedgerAggregate,
        url: string,
        certs?: IAnbGrpcCertificatesFiles
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._url = url;
        this._aggregate = aggregate;
        this._tokenHelper = tokenHelper;

        const protoFilePath = join(dirname(PUBLIC_TYPES_LIB_PATH), "/proto/", PROTO_FILE_NAME);

        const packageDefinition = protoLoader.loadSync(protoFilePath, GRPC_LOAD_PROTO_OPTIONS);
        const proto: ProtoGrpcType = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

        const interceptor: grpc.ServerInterceptor = (methodDescriptor: ServerMethodDefinition<any, any>, call: ServerInterceptingCallInterface)=> {
            return new ServerInterceptingCall(call, {
                start: next => {
                    this._logger.debug(`got connection from ${call.getPeer()} - methodDescriptor: ${methodDescriptor.path}`);
                    const authListener: grpc.ServerListener = {
                        onReceiveMetadata: (metadata, mdNext) => {
                            this._logger.debug(`start call: ${JSON.stringify(call.getPeer())} - onReceiveMetadata: ${JSON.stringify(metadata)}`);
                            mdNext(metadata);

                        },
                        onCancel: () => {

                            this._logger.debug("start - onCancel ");
                        },
                        onReceiveHalfClose: (next1) => {
                            this._logger.debug("start - onReceiveHalfClose ");
                            next1();
                        }
                    };
                    next(authListener);
                },
                // sendStatus: (status1, next) => {
                //     this._logger.debug(`sendStatus: ${JSON.stringify(status1)}`);
                //     next(status1);
                // },
                // sendMessage: (message, next) => {
                //     next(message);
                // },
                // sendMetadata: (metadata, next) => {
                //     this._logger.debug(`sendMetadata: ${JSON.stringify(metadata)}`);
                //     next(metadata);
                // }
            });
        }

        this._server = new grpc.Server({
            //"grpc.max_concurrent_streams": 1,
            interceptors: [interceptor],
        });


        if (this._certFiles) {
            this._credentials = grpc.ServerCredentials.createSsl(
                fs.readFileSync(this._certFiles.caCertFilePath),
                [{
                    private_key: fs.readFileSync(this._certFiles.privateKeyFilePath),
                    cert_chain: fs.readFileSync(this._certFiles.certChainFilePath)
                }],
                true
            );
        } else {
            this._credentials = grpc.ServerCredentials.createInsecure();
        }


        this._server.addService(proto.aandb.builtinledger.GrpcBuiltinLedgerService.service, this._getHandlers());

        this._histo = metrics.getHistogram("BuiltinLedgerGrpcHandler", "GRPC requests handled by the Accounts and Balances Builtin Ledger GRPC Handler", ["callName", "success"]);
        this._batchSizeGauge = metrics.getGauge("BuiltinLedgerGrpcHandler_batchSize");
    }


    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._logger.info(`Starting GRPC service in url: ${this._url}`);
            this._server.bindAsync(this._url, this._credentials, (error) => {
                if (error !== null) {
                    reject(error);
                    return;
                }

                this._logger.info("* * * * * * * * * * * * * * * * * * * *");
                this._logger.info("Accounts and Balances Builtin Ledger gRPC server started 🚀");
                this._logger.info(`URL: ${this._url}`);
                this._logger.info("* * * * * * * * * * * * * * * * * * * *");
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._server.tryShutdown((error) => {
                // When tryShutdown() is called on a server that is not running, the callback's error is not defined.
                // The documentation doesn't specify in what cases the callback's error will be defined, nor if
                // forceShutdown() should be called on error. TODO: investigate.
                if (error !== undefined) {
                    reject(error);
                    return;
                }

                this._logger.info("* * * * * * * * * * * * * * * * * * * *");
                this._logger.info("gRPC server stopped 🏁");
                this._logger.info("* * * * * * * * * * * * * * * * * * * *");
                resolve();
            });
        });
    }

    private _getHandlers(): GrpcBuiltinLedgerServiceHandlers {
        return {
            "ProcessHighLevelBatch": this._processHighLevelBatch.bind(this),
            "CreateJournalEntries": this._createJournalEntries.bind(this),

            "GetAccountsByIds": this._getAccountsByIds.bind(this),
            // "GetAccountsByOwnerId": this._getAccountsByOwnerId.bind(this),

            "GetEntriesByAccountId": this._getJournalEntriesByAccountId.bind(this),
            // "GetEntriesByOwnerId": this._getJournalEntriesByOwnerId.bind(this),

            "CreateAccounts": this._createAccounts.bind(this),
            // "DeleteAccountsByIds": this._deleteAccountsByIds.bind(this),
            // "DeactivateAccountsByIds": this._deactivateAccountsByIds.bind(this),
            // "ActivateAccountsByIds": this._activateAccountsByIds.bind(this),

        };
    }


    /**
     * This will return the secCtx if successful,
     * if not will call the callback with the correct err and return null
     * @param call ServerUnaryCall
     * @param callback sendUnaryData
     * @private
     */
    private async _getSecCtxFromCall(call: ServerUnaryCall<any, any>, callback: sendUnaryData<any>): Promise<CallSecurityContext | null> {
        const timerEndFn = this._histo.startTimer({callName: "_getSecCtxFromCall"});

        const returnUnauthorized = (msg: string) => {
            timerEndFn({success: "false"});
            callback(this._handleAggregateError(new UnauthorizedError(msg)));
            return null;
        };

        const callTokenMeta = call.metadata.get(GRPC_METADATA_TOKEN_FIELD_KEY);
        if (!callTokenMeta) return returnUnauthorized("Could not get token from call metadata");

        const bearerToken = callTokenMeta[0] as string;
        if (!bearerToken) return returnUnauthorized("Could not get token from call metadata array (metadata key exists)");

        const callSecCtx: CallSecurityContext | null = await this._tokenHelper.getCallSecurityContextFromAccessToken(bearerToken);

        if (!callSecCtx) {
            return returnUnauthorized("Unable to verify or decodeToken token");
        }

        timerEndFn({success: "true"});
        return callSecCtx;
    }

    private async _processHighLevelBatch(
        call: ServerUnaryCall<GrpcBuiltinLedger_HighLevelRequestList, GrpcBuiltinLedger_HighLevelResponseList>,
        callback: sendUnaryData<GrpcBuiltinLedger_HighLevelResponseList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const timerEndFn = this._histo.startTimer({callName: "processHighLevelBatch"});

        const grpcReq: GrpcBuiltinLedger_HighLevelRequestList = call.request;
        if (!grpcReq.requestArray) throw new AccountsAndBalancesError("Invalid requestArray in BuiltinLedgerGrpcHighLevelRequest request");

        const highLevelRequests: IAnbHighLevelRequest[] = [];

        // TODO remove this._logger.isDebugEnabled() && this._logger.debug()
        this._logger.isDebugEnabled() && this._logger.debug(`BuiltinLedgerGrpcHandlers _processHighLevelBatch() start with batch of: ${grpcReq.requestArray.length}`);
        const startTime = Date.now();

        this._batchSizeGauge.set(grpcReq.requestArray.length);

        try {
            grpcReq.requestArray.forEach(req => {
                // this will throw if any required field is missing - can safely use bellow
                const request: IAnbHighLevelRequest = this._validateHighLevelRequest(req);
                highLevelRequests.push(request);
            });

            const highLevelResponses: IAnbHighLevelResponse[] =
                await this._aggregate.processHighLevelBatch(secCtx, highLevelRequests);

            // map response
            const grpcResponse: GrpcBuiltinLedger_HighLevelResponseList__Output = {
                responses: highLevelResponses.map(response => {
                    return {
                        requestType: response.requestType,
                        requestId: response.requestId,
                        success: response.success,
                        errorMessage: response.errorMessage || undefined
                    };
                })
            };


            const tookSecs = timerEndFn({success: "true"})/1000;
            const secsPerReq = tookSecs / grpcReq.requestArray.length;
            this._histo.observe({callName:"processHighLevelBatch_perMessage", success:"true" }, secsPerReq);

            this._logger.isDebugEnabled() && this._logger.debug(`BuiltinLedgerGrpcHandlers _processHighLevelBatch() completed with batch of: \t${grpcReq.requestArray.length}`);
            this._logger.isDebugEnabled() && this._logger.debug(`took: ${Math.ceil(tookSecs/1000)} ms - perReq: ${Math.ceil(secsPerReq/1000)}`);
            this._logger.isDebugEnabled() && this._logger.debug("\n\n");

            return callback(null, grpcResponse);
        } catch (error) {
            timerEndFn({success: "false"});
            return callback(this._handleAggregateError(error));
        }
    }

    private _validateHighLevelRequest(req: GrpcBuiltinLedger_HighLevelRequest): IAnbHighLevelRequest {
        const commonFields: null | undefined | GrpcBuiltinLedger_CheckLiquidAndReserveRequest
            | GrpcBuiltinLedger_CancelReservationAndCommitRequest
            | GrpcBuiltinLedger_CancelReservationRequest
            = req.cancelReservationAndCommit || req.cancelReservation || req.checkLiquidityAndReserve;

        if (!commonFields) {
            throw new AccountsAndBalancesError("Invalid BuiltinLedgerGrpcHighLevelRequest request");
        }

        if (!commonFields?.hubJokeAccountId) {
            throw new AccountsAndBalancesError("Invalid hubJokeAccountId on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!commonFields?.payerPositionAccountId) {
            throw new AccountsAndBalancesError("Invalid payerPositionAccountId on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!commonFields?.transferAmount) {
            throw new AccountNotFoundError("Invalid transferAmount on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!commonFields?.currencyCode) {
            throw new AccountNotFoundError("Invalid currencyCode on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!commonFields?.transferId) {
            throw new AccountsAndBalancesError("Invalid transferId on BuiltinLedgerGrpcHighLevelRequest request");
        }


        let resp:IAnbHighLevelRequest;
        let respCommon = {
            requestId: commonFields.requestId!,
            transferId: commonFields.transferId,
            hubJokeAccountId: commonFields.hubJokeAccountId,
            payerPositionAccountId: commonFields.payerPositionAccountId,
            currencyCode: commonFields.currencyCode,
            transferAmount: commonFields.transferAmount,
        }

        if (req.highLeveRequestType === "checkLiquidityAndReserve") {
            if (!req.checkLiquidityAndReserve?.payerLiquidityAccountId) {
                throw new AccountsAndBalancesError("Invalid payerLiquidityAccountId on BuiltinLedgerGrpcHighLevelRequest request");
            }
            if (!req.checkLiquidityAndReserve?.payerNetDebitCap) {
                throw new AccountsAndBalancesError("Invalid payerNetDebitCap on BuiltinLedgerGrpcHighLevelRequest request");
            }

            const specificResp: IAnbCheckLiquidAndReserveRequest = {
                ...respCommon,
                requestType: AnbHighLevelRequestTypes.checkLiquidAndReserve,
                payerLiquidityAccountId: req.checkLiquidityAndReserve.payerLiquidityAccountId,
                payerNetDebitCap: req.checkLiquidityAndReserve.payerNetDebitCap
            }
            resp = specificResp;
        } else if (req.highLeveRequestType === "cancelReservationAndCommit") {
            if (!req.cancelReservationAndCommit?.payeePositionAccountId) {
                throw new AccountNotFoundError("Invalid payeePositionAccountId on CancelReservationAndCommit request");
            }
            const specificResp: IAnbCancelReservationAndCommitRequest = {
                ...respCommon,
                requestType: AnbHighLevelRequestTypes.cancelReservationAndCommit,
                payeePositionAccountId: req.cancelReservationAndCommit.payeePositionAccountId,
            }
            resp = specificResp;
        } else if (req.highLeveRequestType === "cancelReservation") {
            if (!req.cancelReservation?.payerPositionAccountId) {
                throw new AccountNotFoundError("Invalid payerPositionAccountId on CancelReservation request");
            }
            const specificResp: IAnbCancelReservationRequest = {
                ...respCommon,
                requestType: AnbHighLevelRequestTypes.cancelReservation,
            }
            resp = specificResp;
        } else {
            throw new Error("Invalid GrpcBuiltinLedger_HighLevelRequest.highLeveRequestType");
        }

        return resp;
    }

    private async _createAccounts(
        call: ServerUnaryCall<GrpcControlPlane_CreateAccountsRequestList, GrpcControlPlane_CreateAccountsResponseList__Output>,
        callback: sendUnaryData<GrpcControlPlane_CreateAccountsResponseList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        if(!call.request.requests || call.request.requests.length<=0){
            return callback(new AccountsAndBalancesError("Invalid createAccounts request withe empty list"));
        }

        const createAccountReqs: {
            requestedId: string,
            accountType: AnbAccountType,
            currencyCode: string
        }[] = call.request.requests.map(value => {
            return {
                requestedId: value.requestedId!,
                accountType: value.type! as AnbAccountType,
                currencyCode: value.currencyCode!
            };
        });

        let accountIds: CreatedIdMapResponse[];
        try {
            accountIds = await this._aggregate.createAccounts(secCtx, createAccountReqs);
        } catch (error: unknown) {
            return callback(this._handleAggregateError(error));
        }

        const resp: GrpcControlPlane_CreateAccountsResponseList__Output = {
            responses: accountIds.map(value => {
                return {requestedId: value.requestedId, attributedId: value.attributedId};
            })
        }
        callback(null, resp);
    }


    private async _createJournalEntries(
        call: ServerUnaryCall<GrpcBuiltinLedger_CreateJournalEntryRequestList, GrpcControlPlane_IdList__Output>,
        callback: sendUnaryData<GrpcControlPlane_IdList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return;

        if(!call.request.entriesToCreate || call.request.entriesToCreate.length<=0){
            return callback(new AccountsAndBalancesError("Invalid createJournalEntries request withe empty list"));
        }

        const timerEndFn = this._histo.startTimer({callName: "_createJournalEntries"});

        const now = Date.now();

        const createEntriesRequests: {
            amountStr: string, currencyCode: string,creditedAccountId: string, debitedAccountId: string,
            timestamp: number, ownerId: string, pending: boolean
        }[] = call.request.entriesToCreate.map(value => {
            return {
                amountStr: value.amount!,
                pending: value.pending!,
                creditedAccountId: value.creditedAccountId!,
                debitedAccountId: value.debitedAccountId!,
                currencyCode: value.currencyCode!,
                ownerId: value.ownerId!,
                timestamp: now
            };
        });

        let createdIds: string[];
        try {
            createdIds = await this._aggregate.createJournalEntries(secCtx, createEntriesRequests);
        } catch (error: any) {
            timerEndFn({success: "false"});
            return callback(this._handleAggregateError(error));
        }

        const resp: GrpcBuiltinLedger_Id[] = createdIds.map(value => {
            return {id: value};
        });
        timerEndFn({success: "true"});
        callback(null, {ids: resp});
    }

    private async _getAccountsByIds(
        call: ServerUnaryCall<GrpcControlPlane_IdList, GrpcBuiltinLedger_AccountList__Output>,
        callback: sendUnaryData<GrpcBuiltinLedger_AccountList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return;

        if(!call.request.ids || call.request.ids.length<=0){
            return callback(new AccountsAndBalancesError("Invalid getAccountsByIds request withe empty list"));
        }

        const timerEndFn = this._histo.startTimer({callName: "_getAccountsByIds"});

        const accountIds: string[] = [];
        for (const grpcId of call.request.ids) {
            if (!grpcId.id) {
                callback(
                    {code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
                    null
                );
                return;
            }
            accountIds.push(grpcId.id);
        }

        let foundAccountsDtos: BuiltinLedgerAccountDto[];
        try {
            foundAccountsDtos = await this._aggregate.getAccountsByIds(secCtx, accountIds);
        } catch (error: any) {
            timerEndFn({success: "false"});
            return callback(this._handleAggregateError(error));
        }

        const returnAccounts = this._getAccountArrayOutput(foundAccountsDtos);

        timerEndFn({success: "true"});
        callback(null, {accounts: returnAccounts});
    }

/*    private async _getAccountsByOwnerId(
        call: ServerUnaryCall<GrpcBuiltinLedger_Id, GrpcBuiltinLedger_AccountList__Output>,
        callback: sendUnaryData<GrpcBuiltinLedger_AccountList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return;

        const timerEndFn = this._histo.startTimer({callName: "_getAccountsByIds"});

        if (!call.request.id) {
            callback(
                {code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
                null
            );
            return;
        }


        let foundAccountsDtos: BuiltinLedgerAccountDto[];
        try {
            foundAccountsDtos = await this._aggregate.getAccountsByOwnerId(secCtx, call.request.id);
        } catch (error: any) {
            timerEndFn({success: "false"});
            return callback(this._handleAggregateError(error));
        }

        const returnAccounts = this._getAccountArrayOutput(foundAccountsDtos);

        timerEndFn({success: "true"});
        callback(null, {accounts: returnAccounts});
    }*/

    private _getAccountArrayOutput(accountDtos: BuiltinLedgerAccountDto[]): GrpcBuiltinLedger_Account__Output[] {
        const returnAccounts: GrpcBuiltinLedger_Account__Output[] = accountDtos.map((accountDto) => {
            const grpcAccount: GrpcBuiltinLedger_Account__Output = {
                id: accountDto.id,
                state: accountDto.state,
                // type: accountDto.type,
                currencyCode: accountDto.currencyCode,
                postedDebitBalance: accountDto.postedDebitBalance,
                pendingDebitBalance: accountDto.pendingDebitBalance,
                postedCreditBalance: accountDto.postedCreditBalance,
                pendingCreditBalance: accountDto.pendingCreditBalance,
                balance: accountDto.balance,
                timestampLastJournalEntry: accountDto.timestampLastJournalEntry ?? undefined
            };

            return grpcAccount;
        });

        return returnAccounts;
    }

    private async _getJournalEntriesByAccountId(
        call: ServerUnaryCall<GrpcBuiltinLedger_Id, GrpcBuiltinLedger_JournalEntryList__Output>,
        callback: sendUnaryData<GrpcBuiltinLedger_JournalEntryList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return;

        const accountId: string | undefined = call.request.id;
        if (!accountId) {
            callback(
                {code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
                null
            );
            return;
        }

        let foundDtos: BuiltinLedgerJournalEntryDto[];
        try {
            foundDtos = await this._aggregate.getJournalEntriesByAccountId(secCtx, accountId);
        } catch (error: unknown) {
            return callback(this._handleAggregateError(error));
        }

        const returnEntries: GrpcBuiltinLedger_JournalEntry__Output[] = foundDtos.map((dto) => {
            const grpcJournalEntry: GrpcBuiltinLedger_JournalEntry__Output = {
                id: dto.id ?? undefined,
                currencyCode: dto.currencyCode,
                amount: dto.amount,
                debitedAccountId: dto.debitedAccountId,
                creditedAccountId: dto.creditedAccountId,
                timestamp: dto.timestamp || undefined
            };
            return grpcJournalEntry;
        });

        callback(null, {entries: returnEntries});
    }

/*    private async _getJournalEntriesByOwnerId(
        call: ServerUnaryCall<GrpcBuiltinLedger_Id, GrpcBuiltinLedger_JournalEntryList__Output>,
        callback: sendUnaryData<GrpcBuiltinLedger_JournalEntryList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return;

        const ownerId: string | undefined = call.request.id;
        if (!ownerId) {
            callback(
                {code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
                null
            );
            return;
        }

        let foundDtos: BuiltinLedgerJournalEntryDto[];
        try {
            foundDtos = await this._aggregate.getJournalEntriesByOwnerId(secCtx, ownerId);
        } catch (error: unknown) {
            return callback(this._handleAggregateError(error));
        }

        const returnEntries: GrpcBuiltinLedger_JournalEntry__Output[] = foundDtos.map((dto) => {
            const grpcJournalEntry: GrpcBuiltinLedger_JournalEntry__Output = {
                id: dto.id ?? undefined,
                currencyCode: dto.currencyCode,
                amount: dto.amount,
                debitedAccountId: dto.debitedAccountId,
                creditedAccountId: dto.creditedAccountId,
                timestamp: dto.timestamp || undefined
            };
            return grpcJournalEntry;
        });

        callback(null, {entries: returnEntries});
    }*/


    private async _deleteAccountsByIds(
        call: ServerUnaryCall<GrpcBuiltinLedger_IdList, Empty>,
        callback: sendUnaryData<Empty>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const inputAccountIds: GrpcBuiltinLedger_Id[] = call.request.idList || [];

        // map request to struct used to send to the aggregate
        const accountIds: string[] = inputAccountIds.map(value => value.id!);

        try {
            await this._aggregate.deleteAccountsByIds(secCtx, accountIds);
        } catch (error: any) {
            return callback(this._handleAggregateError(error));
        }

        callback(null, {});
    }

    private async _deactivateAccountsByIds(
        call: ServerUnaryCall<GrpcBuiltinLedger_IdList, Empty>,
        callback: sendUnaryData<Empty>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const inputAccountIds: GrpcBuiltinLedger_Id[] = call.request.idList || [];

        // map request to struct used to send to the aggregate
        const accountIds: string[] = inputAccountIds.map(value => value.id!);

        try {
            await this._aggregate.deactivateAccountsByIds(secCtx, accountIds);
        } catch (error: any) {
            return callback(this._handleAggregateError(error));
        }

        callback(null, {});
    }

    private async _activateAccountsByIds(
        call: ServerUnaryCall<GrpcBuiltinLedger_IdList, Empty>,
        callback: sendUnaryData<Empty>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const inputAccountIds: GrpcBuiltinLedger_Id[] = call.request.idList || [];

        // map request to struct used to send to the aggregate
        const accountIds: string[] = inputAccountIds.map(value => value.id!);

        try {
            await this._aggregate.activateAccountsByIds(secCtx, accountIds);
        } catch (error: any) {
            return callback(this._handleAggregateError(error));
        }

        callback(null, {});
    }

    private _handleAggregateError(error: any): ServerErrorResponse {
        const srvError: ServerErrorResponse = {
            name: error.constructor.name,
            message: error.message || error.constructor.name,
            details: error.message || error.constructor.name,
        };

        if (error instanceof UnauthorizedError) {
            this._logger.warn(`Got UnauthorizedError - message: ${error.message}`);
            srvError.code = status.UNAUTHENTICATED;
        } else if (error instanceof ForbiddenError) {
            this._logger.warn(`Got ForbiddenError - message: ${error.message}`);
            srvError.code = status.PERMISSION_DENIED;
        } else if (error instanceof AccountNotFoundError) {
            this._logger.warn(`Got AccountNotFoundError - message: ${error.message}`);
            srvError.code = status.NOT_FOUND;
        } else {
            this._logger.warn(`Got unknown error message - message: ${error.message}`);
            srvError.code = status.UNKNOWN;
        }
        return srvError;
    }
}
