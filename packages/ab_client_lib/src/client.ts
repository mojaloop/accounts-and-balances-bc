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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import * as grpc from "@grpc/grpc-js";
import {ChannelCredentials, Metadata, ServiceError, StatusObject} from "@grpc/grpc-js";
import {dirname, join} from "path";
import console from "console";
import * as protoLoader from "@grpc/proto-loader";
import * as fs from "fs";

import {ICoaAccount, ILedgerDataPlaneClient} from "./types";
import {BuiltinLedgerDataPlaneClient} from "./implementations/builtin_client";

import {
    AccountAlreadyExistsError,
    AccountNotFoundError,
    AccountsAndBalancesError,
    AnbAccountState,
    AnbAccountType, AnbHighLevelRequestTypes,
    GRPC_LOAD_PROTO_OPTIONS,
    GRPC_METADATA_TOKEN_FIELD_KEY, IAnbAccount,
    IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbCreateAccountRequest, IAnbCreateJournalEntryRequest,
    IAnbCreateResponse,
    IAnbGrpcCertificatesFiles,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse,
    IAnbJournalEntry
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {
    ProtoGrpcType as ControlPlaneProtoGrpcType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/control_plane";
import {AuthToken, ILoginHelper} from "@mojaloop/security-bc-public-types-lib";
import {Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {getCurrencyOrThrow} from "./utils";
import {TigerBeetleDataPlaneClient} from "./implementations/tigerbeetle/tigerbeetle_client";
import {TigerBeetleDataPlaneClient_NoLookup} from "./implementations/tigerbeetle/tigerbeetle_client_no_lookup";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
    GrpcControlPlaneServiceClient
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlaneService";
import {
    GrpcControlPlane_FromClientMsg
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_FromClientMsg";
import {
    GrpcControlPlane_ToClientMsg,
    GrpcControlPlane_ToClientMsg__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_ToClientMsg";
import {
    GrpcControlPlane_LedgerServiceType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_LedgerServiceType";
import {
    GrpcControlPlane_BuiltinLedgerEndpoint
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_BuiltinLedgerEndpoint";
import {
    GrpcControlPlane_ClientInitialRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_ClientInitialRequest";
import {
    GrpcControlPlane_CoaAccount
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaAccount";
import {
    GrpcControlPlane_CreateAccountsRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsRequestList";
import {
    GrpcControlPlane_CreateAccountsResponseList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsResponseList";
import {
    GrpcControlPlane_LedgerEndpointDetails
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_LedgerEndpointDetails";
import {randomUUID} from "crypto";
import {
    GrpcControlPlane_CoaCurrency
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaCurrency";
import {
    GrpcControlPlane_IdList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_IdList";
import {
    GrpcControlPlane_CoaAccountList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaAccountList";
import process from "process";
import {TigerBeetleDataPlaneClient_NoLookup2} from "./implementations/tigerbeetle/tigerbeetle_client_no_lookup2";

const PUBLIC_TYPES_LIB_PATH = require.resolve("@mojaloop/accounts-and-balances-bc-public-types-lib");
const CONTROL_PLANE_PROTO_FILE_NAME = "control_plane.proto";

const DEFAULT_GRPC_CONNECT_TIMEOUT_MS = 5_000;

const USE_TIGERBEETLE_NOLOOKUP = process.env["USE_TIGERBEETLE_NOLOOKUP"] && process.env["USE_TIGERBEETLE_NOLOOKUP"].toUpperCase() === "TRUE" || false;

export class AccountsAndBalancesClient {
    private readonly _logger: ILogger;
    private readonly _controlPlaneUrl: string;
    private readonly _metrics:IMetrics;
    private readonly _histo:IHistogram;
    private _currencies:Currency[];
    private readonly _grpcConnectTimeOutMs: number;
    private readonly _callMetadata: grpc.Metadata;
    private _controlPlaneClient: GrpcControlPlaneServiceClient;
    private _controlPlaneStream: grpc.ClientDuplexStream<GrpcControlPlane_FromClientMsg, GrpcControlPlane_ToClientMsg__Output>;

    private readonly _certFiles: IAnbGrpcCertificatesFiles | undefined = undefined;

    private _ledgerType: GrpcControlPlane_LedgerServiceType;
    private _tigerBeetleReplicaAddresses: string | undefined;
    private _tigerBeetleClusterId: number | undefined;
    private _builtinLedgerEndpoints: GrpcControlPlane_BuiltinLedgerEndpoint[] = [];
    private _builtinLedgerCurEndpointIndex = 0;

    private _coaAccountsMap: ICoaAccount[] = [];

    private _ledgerDataPlaneClient: ILedgerDataPlaneClient;
    private readonly _loginHelper: ILoginHelper;

    constructor(
        controlPlaneUrl: string, logger: ILogger,
        loginHelper: ILoginHelper,
        metrics:IMetrics,
        certs?: IAnbGrpcCertificatesFiles,
        grpcConnectTimeOutMs: number = DEFAULT_GRPC_CONNECT_TIMEOUT_MS
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._controlPlaneUrl = controlPlaneUrl;
        this._metrics = metrics;
        this._loginHelper = loginHelper;
        this._certFiles = certs;
        this._grpcConnectTimeOutMs = grpcConnectTimeOutMs;
        this._callMetadata = new grpc.Metadata();

        this._histo = metrics.getHistogram("AccountsAndBalancesClient", "AccountsAndBalancesClient metrics", ["callName", "success"]);

        // load protos
        const protoFilePath = join(dirname(PUBLIC_TYPES_LIB_PATH), "/proto/", CONTROL_PLANE_PROTO_FILE_NAME);
        const controlPlanePackageDefinition = protoLoader.loadSync(protoFilePath, GRPC_LOAD_PROTO_OPTIONS);
        const controlPlaneProto: ControlPlaneProtoGrpcType = grpc.loadPackageDefinition(controlPlanePackageDefinition) as unknown as ControlPlaneProtoGrpcType;

        // instantiate data plane client
        let channelCredentials: ChannelCredentials;
        if (this._certFiles) {
            channelCredentials = grpc.credentials.createSsl(
                fs.readFileSync(this._certFiles.caCertFilePath),
                fs.readFileSync(this._certFiles.privateKeyFilePath),
                fs.readFileSync(this._certFiles.certChainFilePath)
            );
        } else {
            channelCredentials = grpc.credentials.createInsecure();
        }

        // const metaCallback = (params: CallMetadataOptions, callback: (err: (Error | null), metadata?: Metadata) => void) => {
        //     const meta = new grpc.Metadata();
        //     meta.add("vnext-bearer-token", "pedrosotken");
        //     callback(null, meta);
        // };
        // const callCreds = grpc.credentials.createFromMetadataGenerator(metaCallback);
        // const combCreds = grpc.credentials.combineChannelCredentials(credentials, callCreds);
        //

        this._controlPlaneClient = new controlPlaneProto.aandb.controlplane.GrpcControlPlaneService(
            controlPlaneUrl,
            // combCreds,
            channelCredentials,
            {
                // "grpc.enable_retries": 3,
            }
        );

        this._logger.info(`${this.constructor.name} created with controlPlaneUrl: ${controlPlaneUrl}`);
    }

    async Init(): Promise<void> {
        this._logger.info(`${this.constructor.name} initialising, going to get a token...`);
        await this._loginHelper.getToken();
        this._logger.info(`${this.constructor.name} token obtained, starting the control plane channel...`);
        // TODO renew token and resend to control plane on a timer

        await this._initControlPlane();

        // we now can init the data plane
        await this._initDataPlane();

        /*
        * Consider an interval based ping (liveliness check) - to keep the connection alive
        * TB note, this will avoid the no_session error on long idle sessions
        *
        * Ex:
        * error(replica): 0: on_request: no session
        *     error(replica): 0: sending eviction message to client=182784961800021962853606190121354679010 reason=no_session
        * */

        this._logger.info(`${this.constructor.name} initialisation complete`);

        return Promise.resolve();
    }

    async Destroy(): Promise<void> {
        await this._ledgerDataPlaneClient.destroy();
    }

    async isReady(): Promise<boolean> {
        if(!this._ledgerDataPlaneClient || this._coaAccountsMap.length<=0){
            return Promise.resolve(false);
        }
        const ledgerReady = await this._ledgerDataPlaneClient.isReady();
        return ledgerReady;
    }

    get coaAccounts(): ICoaAccount[] {
        return this._coaAccountsMap || [];
    }

    // start the control plane stream and wait for ControlPlaneInitialResponse
    private async _initControlPlane(): Promise<void> {
        await this._updateCallMetadata();

        return new Promise((resolve, reject) => {
            const deadline: grpc.Deadline = Date.now() + this._grpcConnectTimeOutMs;
            this._controlPlaneClient.waitForReady(deadline, (error?: Error) => {
                if (error)
                    return reject(error);

                this._controlPlaneStream = this._controlPlaneClient.ClientStream(this._callMetadata);

                //const stream = this._controlPlaneClient.ClientStream({ interceptors: [interceptor] });

                const initialRespTimeout = setTimeout(() => {
                    this._controlPlaneStream.removeListener("data", localOnDataListener);
                    this._controlPlaneStream.removeListener("error", localOnErrorListener);

                    return reject(Error(`${this.constructor.name} initControlPlane timed out while waiting for initial response from control plane`));
                }, this._grpcConnectTimeOutMs);

                const continueInit = () => {
                    if (initialRespTimeout.hasRef())
                        clearTimeout(initialRespTimeout);

                    // remove local listeners and add class listeners
                    this._controlPlaneStream.removeListener("data", localOnDataListener);
                    this._controlPlaneStream.removeListener("error", localOnErrorListener);

                    this._controlPlaneStream.on("data", this._controlPlane_onData.bind(this));
                    this._controlPlaneStream.on("end", this._controlPlane_onEnd.bind(this));
                    this._controlPlaneStream.on("error", this._controlPlane_onError.bind(this));
                    this._controlPlaneStream.on("status", this._controlPlane_onStatus.bind(this));

                    // do we need these?
                    this._controlPlaneStream.on("close", () => {
                        console.log("stream on close");
                    });
                    this._controlPlaneStream.on("finish", () => {
                        console.log("stream on finish");
                    });
                    this._logger.info(`${this.constructor.name} control plane initialised and control stream open`);

                    return resolve();
                };

                const localOnDataListener = (data: GrpcControlPlane_ToClientMsg) => {
                    //console.log(data);

                    if (!data.initialResponse) {
                        return; // ignore other messages for now (shouldn't happen)
                    }

                    if (data.initialResponse.ledgerServiceType === undefined || data.initialResponse.ledgerServiceType === null) {
                        return reject(new Error("Invalid ledgerServiceType in GrpcControlPlane_InitialResponseToClient"));
                    }
                    this._ledgerType = data.initialResponse.ledgerServiceType;

                    if (!data.initialResponse.ledgerEndpointDetails) {
                        return reject(new Error("Invalid ledgerServerDetails in GrpcControlPlane_InitialResponseToClient"));
                    }
                    this._updateLedgerEndpoints(data.initialResponse.ledgerEndpointDetails);


                    // Note the server will only automatically send hub recon and participant position and liquidity accounts, others have to be checked case by case
                    if (!data.initialResponse.accountMap || !data.initialResponse.accountMap.accounts || data.initialResponse.accountMap.accounts.length <= 0) {
                        return reject(new Error("Invalid or empty accountMap in GrpcControlPlane_InitialResponseToClient"));
                    }
                    this._updateLocalCoaAccountMap(data.initialResponse.accountMap.accounts);

                    if (!data.initialResponse.coaCurrencies || !data.initialResponse.coaCurrencies.list || data.initialResponse.coaCurrencies.list.length <= 0) {
                        return reject(new Error("Invalid or empty coaCurrencies in GrpcControlPlane_InitialResponseToClient"));
                    }
                    this._updateLocalCurrencyList(data.initialResponse.coaCurrencies.list);

                    continueInit();
                };

                const localOnErrorListener = (error: Error) => {
                    if (initialRespTimeout.hasRef()) clearTimeout(initialRespTimeout);
                    this._logger.error(error);
                    return reject(error);
                };

                // hook local/minimal listeners
                this._controlPlaneStream.addListener("data", localOnDataListener);
                this._controlPlaneStream.addListener("error", localOnErrorListener);


                // send ClientInitialRequest
                const initialRequest: GrpcControlPlane_ClientInitialRequest = {
                    clientName: "test1",
                    token: "token"
                };
                this._controlPlaneStream.write({initialRequest: initialRequest});
            });
        });
    }

    private _updateLedgerEndpoints(ledgerEndpointDetails: GrpcControlPlane_LedgerEndpointDetails): void {
        if (this._ledgerType === GrpcControlPlane_LedgerServiceType.TigerBeetle) {
            if (ledgerEndpointDetails.tigerBeetleInfo?.clusterId === undefined ||
                !ledgerEndpointDetails.tigerBeetleInfo?.replicas) {
                throw new Error("Invalid tigerBeetleInfo in GrpcControlPlane_InitialResponseToClient");
            }
            this._tigerBeetleClusterId = ledgerEndpointDetails.tigerBeetleInfo.clusterId;
            this._tigerBeetleReplicaAddresses = ledgerEndpointDetails.tigerBeetleInfo.replicas;

            this._logger.info(`Ledger Endpoints updated - LedgerType: 'TigerBeetle', clusterId: ${ledgerEndpointDetails.tigerBeetleInfo.clusterId} and replicas: ${ledgerEndpointDetails.tigerBeetleInfo.replicas}`);
        } else {
            // assume builtin
            if (!ledgerEndpointDetails.builtinLedgerEndpoints?.endpoints
                || ledgerEndpointDetails.builtinLedgerEndpoints?.endpoints.length <= 0) {
                throw new Error("Invalid builtinLedgerEndpoints in GrpcControlPlane_InitialResponseToClient");
            }
            this._builtinLedgerEndpoints = ledgerEndpointDetails.builtinLedgerEndpoints.endpoints;

            this._logger.info(`Ledger Endpoints updated - LedgerType: 'Builtin', ${ledgerEndpointDetails.builtinLedgerEndpoints.endpoints.length} endpoint(s)`);
        }
    }

    private _updateLocalCoaAccountMap(grpcCoaAccounts: GrpcControlPlane_CoaAccount[]): void {
        // Note the server will only automatically send hub recon and participant position and liquidity accounts,
        // others account types have to be requested manually

        grpcCoaAccounts.forEach(acc => {
            if (!acc.id || !acc.type || !acc.ownerId || !acc.ledgerAccountId || !acc.state
                || acc.currencyCode === undefined || acc.currencyCode === null
                || acc.currencyDecimals === undefined || acc.currencyDecimals === null
            ) {
                throw new AccountsAndBalancesError("Invalid data in CoaAccount received from Control Plane");
            }

            this._coaAccountsMap.push({
                id: acc.id,
                type: acc.type as AnbAccountType,
                ownerId: acc.ownerId,
                ledgerAccountId: acc.ledgerAccountId,
                state: acc.state as AnbAccountState,
                currencyCode: acc.currencyCode,
                currencyDecimals: acc.currencyDecimals
                //currencyCodeNum: acc.currencyCodeNum
            });
        });
        this._logger.info(`CoaAccountsMap updated, now have: ${this._coaAccountsMap.length} accounts of type position and liquidity`);
    }

    private async _updateLocalCurrencyList(currencies: GrpcControlPlane_CoaCurrency[]){
        this._currencies = currencies.map(coaCur => {
            if(coaCur.code===undefined || coaCur.num===undefined ||coaCur.decimals===undefined){
                throw new AccountsAndBalancesError("Invalid data in coaCurrencies received from Control Plane");
            }
            return{
                code: coaCur.code,
                num: coaCur.num,
                decimals: coaCur.decimals
            };
        });

        this._logger.info(`Local Currency List updated, now have: ${this._currencies.length} currencies`);
    }

    private async _controlPlane_onStatus(status: StatusObject) {
        this._logger.isDebugEnabled() && this._logger.debug(`Control plane stream on status: ${JSON.stringify(status, null, 2)}`);
    }

    private async _controlPlane_onData(data: GrpcControlPlane_ToClientMsg) {
        this._logger.isDebugEnabled() && this._logger.debug(`Control plane stream on data: ${JSON.stringify(data, null, 2)}`);

        if(data.responseType === "updatedEndpointDetails" && data.updatedEndpointDetails){
            this._updateLedgerEndpoints(data.updatedEndpointDetails);

            // TODO reconnect?
        }else if(data.responseType === "accountMap" && data.accountMap?.accounts){
            this._updateLocalCoaAccountMap(data.accountMap.accounts);
        }

    }

    private async _controlPlane_onError(error: Error) {
        console.error(error);
    }

    private async _controlPlane_onEnd() {
        console.log("stream on end");
    }

    private async _dataPlaneReadyStateChanged(ready: boolean): Promise<void> {
        // TODO provide an external handler/callback
        if (!ready) {
            if (this._ledgerType === GrpcControlPlane_LedgerServiceType.BuiltinGrpc) {
                // get the next endpoint
                this._builtinLedgerCurEndpointIndex = this._builtinLedgerCurEndpointIndex++ % this._builtinLedgerEndpoints.length;
                await this._initDataPlane();
            }
        }
    }

    private async _initDataPlane(): Promise<void> {
        if (this._ledgerType === GrpcControlPlane_LedgerServiceType.BuiltinGrpc) {
            return this._initBuiltinGrpcDataPlane();
        } else {
            return this._initTigerbeetleDataPlane();
        }
    }

    private async _initBuiltinGrpcDataPlane(): Promise<void> {
        if (!this._builtinLedgerEndpoints || this._builtinLedgerEndpoints.length <= 0) {
            const errorMsg = "Cannot initialise BuiltinGrpc dataplane without _builtinLedgerEndpoints";
            this._logger.warn(errorMsg);
            return Promise.reject(new Error(errorMsg));
        }

        const address = this._builtinLedgerEndpoints[this._builtinLedgerCurEndpointIndex];
        if (!address.url) {
            const errorMsg = "Cannot initialise BuiltinGrpc dataplane without a valid URL in the first builtinLedgerEndpoints";
            this._logger.warn(errorMsg);
            return Promise.reject(new Error(errorMsg));
        }

        const client = new BuiltinLedgerDataPlaneClient(
            address.url, this._logger, this._loginHelper,
            this._metrics, this._grpcConnectTimeOutMs
        );
        client.setReadyStateChangedListener(this._dataPlaneReadyStateChanged.bind(this));

        this._ledgerDataPlaneClient = client;
        await this._ledgerDataPlaneClient.init();

        return Promise.resolve();
    }

    private async _initTigerbeetleDataPlane(): Promise<void> {
        if (this._tigerBeetleClusterId === undefined ||
            this._tigerBeetleClusterId === null ||
            !this._tigerBeetleReplicaAddresses) {
            throw new Error("Invalid tigerBeetleInfo endpoint data, cannot initialise data plane");
        }

        let client: TigerBeetleDataPlaneClient;
        if(USE_TIGERBEETLE_NOLOOKUP){
            client = new TigerBeetleDataPlaneClient_NoLookup2(
                this._tigerBeetleClusterId, this._tigerBeetleReplicaAddresses,
                this._currencies, this._logger, this._metrics
            );
        }else{
            client = new TigerBeetleDataPlaneClient(
                this._tigerBeetleClusterId, this._tigerBeetleReplicaAddresses,
                this._currencies, this._logger, this._metrics
            );
        }

        client.setReadyStateChangedListener(this._dataPlaneReadyStateChanged.bind(this));

        this._ledgerDataPlaneClient = client;
        await this._ledgerDataPlaneClient.init();

        return Promise.resolve();
    }

    /**
     * Waits for ready and updates the call metadata object
     */
    async _startControlPlaneUnaryCall(accessToken?:string):Promise<void>{
        const deadline: grpc.Deadline = Date.now() + this._grpcConnectTimeOutMs;
        this._controlPlaneClient.waitForReady(deadline, async (error?: Error) => {
            if (error)
                return Promise.reject(error);

            await this._updateCallMetadata(accessToken);

            return Promise.resolve();
        });
    }

    private async _updateCallMetadata(accessToken?:string): Promise<void> {
        // this can throw and UnauthorizedError, let it
        if(!accessToken) {
            const token = await this._loginHelper.getToken();
            accessToken = token.accessToken;
        }

        this._callMetadata.set(GRPC_METADATA_TOKEN_FIELD_KEY, accessToken);
        return Promise.resolve();
    }

    /*
    ***************************************
    Client to ledger - write methods
    ***************************************
    */



    async processHighLevelBatch(requests: IAnbHighLevelRequest[], accessToken?:string): Promise<IAnbHighLevelResponse[]> {
        const timerEndFn = this._histo.startTimer({callName: "processHighLevelBatch"});
        // const startTs = Date.now();

        const timerEndFn_prep = this._histo.startTimer({callName: "processHighLevelBatch_prep"});
        // map and validate the accounts
        requests.forEach(req => {

            // currency check here
            getCurrencyOrThrow(this._currencies, req.currencyCode);

            // specific request types
            if (req.requestType === AnbHighLevelRequestTypes.checkLiquidAndReserve) {
                const specificReq = req as IAnbCheckLiquidAndReserveRequest;
                specificReq.payerLiquidityAccountId = this._getLedgerAccountIdOrThrow(specificReq.payerLiquidityAccountId, req.currencyCode);
            } else if (req.requestType === AnbHighLevelRequestTypes.cancelReservationAndCommit) {
                const specificReq = req as IAnbCancelReservationAndCommitRequest;
                specificReq.payeePositionAccountId = this._getLedgerAccountIdOrThrow(specificReq.payeePositionAccountId, req.currencyCode);

                //TigerBeetle no-lookup mode control accounts
                if(USE_TIGERBEETLE_NOLOOKUP) {
                    if(!specificReq.payeeControlAccountId) throw new AccountNotFoundError("Invalid payeeControlAccountId in IAccountsBalancesHighLevelRequest");
                    specificReq.payeeControlAccountId = this._getLedgerAccountIdOrThrow(specificReq.payeeControlAccountId, req.currencyCode);
                }
            }

            // common required accounts
            const coaPayerPositionAccount = this._getLocalCoaAccountByIdAndCurrencyCode(req.payerPositionAccountId, req.currencyCode);
            if (!coaPayerPositionAccount) throw new AccountNotFoundError("Account not found on for payerPositionAccountId in IAccountsBalancesHighLevelRequest");
            req.payerPositionAccountId = coaPayerPositionAccount.ledgerAccountId;

            const coaHubJokeAccount = this._getLocalCoaAccountByIdAndCurrencyCode(req.hubJokeAccountId, req.currencyCode);
            if (!coaHubJokeAccount) throw new AccountNotFoundError("Account not found on for hubJokeAccountId in IAccountsBalancesHighLevelRequest");
            req.hubJokeAccountId = coaHubJokeAccount.ledgerAccountId;

            //Common TigerBeetle no-lookup mode control accounts
            if(USE_TIGERBEETLE_NOLOOKUP) {
                if(!req.payerControlAccountId) throw new AccountNotFoundError("Invalid payerControlAccountId in IAccountsBalancesHighLevelRequest");
                req.payerControlAccountId = this._getLedgerAccountIdOrThrow(req.payerControlAccountId, req.currencyCode);

                if(!req.hubTmpControlAccountId) throw new AccountNotFoundError("Invalid hubTmpControlAccountId in IAccountsBalancesHighLevelRequest");
                req.hubTmpControlAccountId = this._getLedgerAccountIdOrThrow(req.hubTmpControlAccountId, req.currencyCode);
            }
        });
        timerEndFn_prep({success: "true"});

        const timerEndFn_dataPlane = this._histo.startTimer({callName: "processHighLevelBatch_dataPlane"});
        const response = await this._ledgerDataPlaneClient.processHighLevelBatch(requests, accessToken);
        timerEndFn_dataPlane({success: "true"});

        //console.log(`processHighLevelBatch took ${Date.now()-startTs} ms to process a batch of: ${requests.length} requests`);
        timerEndFn({success: "true"});
        return response;
    }

    async createJournalEntries(entriesRequested: IAnbCreateJournalEntryRequest[], accessToken?:string): Promise<IAnbCreateResponse[]>{
        const timerEndFn = this._histo.startTimer({callName: "createJournalEntries"});

        // make sure we have all the CoA accounts referenced in the entries
        // the coaAccounts cached in this client contain only certain types
        const referencedCoaAccounts: ICoaAccount[] = [];
        const accountsIdsMissingFromClient: string[] = [];

        for(const entryReq of entriesRequested){
            const foundDebitedAccount = this._coaAccountsMap.find(value => value.id === entryReq.debitedAccountId);
            if(!foundDebitedAccount){
                if(!accountsIdsMissingFromClient.includes(entryReq.debitedAccountId)) {
                    accountsIdsMissingFromClient.push(entryReq.debitedAccountId);
                }
            }else{
                if(!referencedCoaAccounts.find(value => value.id ===foundDebitedAccount.id)) {
                    referencedCoaAccounts.push(foundDebitedAccount);
                }
            }

            const foundCreditedAccount = this._coaAccountsMap.find(value => value.id === entryReq.creditedAccountId);
            if(!foundCreditedAccount){
                if(!accountsIdsMissingFromClient.includes(entryReq.creditedAccountId)) accountsIdsMissingFromClient.push(entryReq.creditedAccountId);
            }else{
                if(!referencedCoaAccounts.find(value => value.id ===foundCreditedAccount.id)) referencedCoaAccounts.push(foundCreditedAccount);
            }
        }

        if(accountsIdsMissingFromClient.length>0){
            // get the missing ones from the control plane and get their ledgerAccountIds
            const missingCoaAccounts = await this._getCoaAccountsByIds(accountsIdsMissingFromClient);
            // no need to check if we've got them all, later we will throw if any account is missing
            referencedCoaAccounts.push(...missingCoaAccounts);
        }

        const entriesToSend: IAnbCreateJournalEntryRequest[] = [];
        // validate the entries and map accounts
        entriesRequested.forEach(entry => {
            // currency check here
            getCurrencyOrThrow(this._currencies, entry.currencyCode);

            // check accounts
            const debitedAccount = referencedCoaAccounts.find(value => value.ledgerAccountId===entry.debitedAccountId);
            if (!debitedAccount || debitedAccount.currencyCode != entry.currencyCode) {
                throw new AccountNotFoundError(`Account not found on for debitedAccountId in createJournalEntries - id:${entry.debitedAccountId} currencyCode: ${entry.currencyCode}`);
            }
            const creditedAccount = referencedCoaAccounts.find(value => value.ledgerAccountId===entry.creditedAccountId);
            if (!creditedAccount || creditedAccount.currencyCode != entry.currencyCode) {
                throw new AccountNotFoundError(`Account not found on for creditedAccountId in createJournalEntries - id:${entry.creditedAccountId} currencyCode: ${entry.currencyCode}`);
            }

            entriesToSend.push({
                requestedId: entry.requestedId || randomUUID(), // we need a requestedId to map the response after
                debitedAccountId: debitedAccount.ledgerAccountId,
                creditedAccountId: creditedAccount.ledgerAccountId,
                currencyCode: entry.currencyCode,
                ownerId: entry.ownerId,
                amount: entry.amount,
                pending: entry.pending
            });
        });

        const timerEndFn_ledger = this._histo.startTimer({callName: "createJournalEntries_request"});
        let responses:IAnbCreateResponse[];
        try {
            // send the entries to the remote ledger
            responses = await this._ledgerDataPlaneClient.createJournalEntries(entriesToSend, accessToken);
            timerEndFn_ledger({success: "true"});
        }catch(err:any){
            timerEndFn_ledger({success: "false"});
            timerEndFn({success: "false"});
            throw new AccountsAndBalancesError(`Error creating journal entries in remote ledger, error: ${err?.message || "unkonwn"}`);
        }

        timerEndFn({success: "true"});

        // remap needed?
        return responses;
    }

    /*
    ***************************************
    Client to ledger - read methods
    ***************************************
    */

    async getAccountsByIds(accountIds: string[], accessToken?:string): Promise<IAnbAccount[]> {
        const timerEndFn = this._histo.startTimer({callName: "getAccountsByIds"});

        try {
            const accountsMissingFromClient: string[] = [];
            const ledgerAccountIds: string[] = [];
            const coaAccounts:  ICoaAccount[] = [];

            // get the ledgerAccountIds from the coaAccounts cached in this client (only certain types)
            for(const coaAccId of accountIds){
                const foundAccount = this._coaAccountsMap.find(value => value.id === coaAccId);
                if(!foundAccount){
                    accountsMissingFromClient.push(coaAccId);
                }else{
                    coaAccounts.push(foundAccount);
                    ledgerAccountIds.push(foundAccount.ledgerAccountId);
                }
            }

            if(accountsMissingFromClient.length>0){
                // get the missing ones from the control plane and get their ledgerAccountIds
                const missingCoaAccounts = await this._getCoaAccountsByIds(accountsMissingFromClient);
                for(const id of accountsMissingFromClient){
                    const foundAccount = missingCoaAccounts.find(value => value.id === id);
                    if(!foundAccount){
                        throw new AccountNotFoundError(`Account not found on - id:${id}`);
                    }
                    coaAccounts.push(foundAccount);
                    ledgerAccountIds.push(foundAccount.ledgerAccountId);
                }
            }

            if(ledgerAccountIds.length<=0) return [];

            const ledgerAccounts = await this._ledgerDataPlaneClient.getAccountsByIds(ledgerAccountIds, accessToken);
            // todo: remap to add metadata

            const ret: IAnbAccount[] = ledgerAccounts.map(ledgerAcc => {
                const coaAcc = coaAccounts.find(value => value.ledgerAccountId === ledgerAcc.id);
                if(!coaAcc) {
                    throw new Error(`Coa account id not found for ledger account with id: ${ledgerAcc.id}`);
                }
                return {
                    id: coaAcc.id,
                    type: coaAcc.type,
                    state: coaAcc.state,
                    ownerId: coaAcc.ownerId,
                    currencyCode: coaAcc.currencyCode,
                    balance: ledgerAcc.balance,
                    postedDebitBalance: ledgerAcc.postedDebitBalance,
                    postedCreditBalance: ledgerAcc.postedCreditBalance,
                    pendingDebitBalance: ledgerAcc.pendingDebitBalance,
                    pendingCreditBalance: ledgerAcc.pendingCreditBalance,
                    timestampLastJournalEntry: ledgerAcc.timestampLastJournalEntry
                };
            });

            timerEndFn({success: "true"});
            return ret;
        }catch(err:any){
            timerEndFn({success: "false"});
            if(err instanceof AccountNotFoundError) throw err;
            throw new AccountsAndBalancesError(`Error on getAccountsByIds - msg: ${err?.message || "unknown"}`);
        }
    }

    async getJournalEntriesByAccountId(accountId: string, accessToken?:string): Promise<IAnbJournalEntry[]> {
        const timerEndFn = this._histo.startTimer({callName: "getJournalEntriesByAccountId"});

        try {
            let coaAccount:ICoaAccount;

            const localCoaAccount = this._coaAccountsMap.find(item => item.id === accountId);
            if (localCoaAccount) {
                coaAccount = localCoaAccount;
            } else {
                const retCoaAccounts = await this._getCoaAccountsByIds([accountId]);

                if (!retCoaAccounts || retCoaAccounts.length != 1 || !retCoaAccounts[0]) {
                    throw new AccountNotFoundError(`Account not found on for getJournalEntriesByAccountId request - id:${accountId}`);
                }
                coaAccount = retCoaAccounts[0];
            }

            const response = await this._ledgerDataPlaneClient.getJournalEntriesByAccountId(coaAccount.ledgerAccountId, accessToken);

            const mappedResponse: IAnbJournalEntry[] = response.map(ledgerEntry => {
                const creditedCoaAccount = this._coaAccountsMap.find(item => item.ledgerAccountId === ledgerEntry.creditedAccountId);
                if (!creditedCoaAccount) {
                    throw new AccountNotFoundError(`Credited account not found on for getJournalEntriesByAccountId request - ledger account id:${ledgerEntry.creditedAccountId}`);
                }
                const debitedCoaAccount = this._coaAccountsMap.find(item => item.ledgerAccountId === ledgerEntry.debitedAccountId);
                if (!debitedCoaAccount) {
                    throw new AccountNotFoundError(`Debited account not found on for getJournalEntriesByAccountId request - ledger account id:${ledgerEntry.debitedAccountId}`);
                }

                return {
                    // from the CoA Account
                    id: coaAccount.id,
                    ownerId: coaAccount.ownerId,
                    currencyCode: coaAccount.currencyCode,
                    debitedAccountId: debitedCoaAccount.id,
                    creditedAccountId: creditedCoaAccount.id,
                    // from the ledger entry
                    amount: ledgerEntry.amount,
                    pending: ledgerEntry.pending,
                    timestamp: ledgerEntry.timestamp
                };
            });

            timerEndFn({success: "true"});
            return mappedResponse;
        }catch(err:any){
            timerEndFn({success: "false"});
            if(err instanceof AccountNotFoundError) throw err;
            throw new AccountsAndBalancesError(`Error on getJournalEntriesByAccountId - msg: ${err?.message || "unknown"}`);
        }
    }

 /*
    async getJournalEntriesByOwnerId(ownerId: string, accessToken?:string): Promise<IAnbJournalEntry[]> {
        const timerEndFn = this._histo.startTimer({callName: "getJournalEntriesByOwnerId"});

        try {
            const response = await this._ledgerDataPlaneClient.getJournalEntriesByOwnerId(ownerId, accessToken);

            const mappedResponse: IAnbJournalEntry[] = response.map(ledgerEntry => {
                const creditedCoaAccount = this._coaAccountsMap.find(item => item.ledgerAccountId === ledgerEntry.creditedAccountId);
                if (!creditedCoaAccount) {
                    throw new AccountNotFoundError(`Credited account not found on for getJournalEntriesByOwnerId request - ledger account id:${ledgerEntry.creditedAccountId}`);
                }
                const debitedCoaAccount = this._coaAccountsMap.find(item => item.ledgerAccountId === ledgerEntry.debitedAccountId);
                if (!debitedCoaAccount) {
                    throw new AccountNotFoundError(`Debited account not found on for getJournalEntriesByOwnerId request - ledger account id:${ledgerEntry.debitedAccountId}`);
                }

                return {
                    // from the CoA Account
                    debitedAccountId: debitedCoaAccount.id,
                    creditedAccountId: creditedCoaAccount.id,
                    // from the ledger entry
                    id: ledgerEntry.id,
                    ownerId: ledgerEntry.ownerId,
                    currencyCode: ledgerEntry.currencyCode,
                    amount: ledgerEntry.amount,
                    pending: ledgerEntry.pending,
                    timestamp: ledgerEntry.timestamp
                };
            });

            timerEndFn({success: "true"});
            return mappedResponse;
        }catch(err:any){
            timerEndFn({success: "false"});
            if(err instanceof AccountNotFoundError) throw err;
            throw new AccountsAndBalancesError(`Error on getJournalEntriesByOwnerId - msg: ${err?.message || "unknown"}`);
        }
    }
*/

    /*
    ***************************************
    Client to control plane - management methods
    ***************************************
    */

    async createAccounts(createRequests: IAnbCreateAccountRequest[], accessToken?:string): Promise<IAnbCreateResponse[]> {
        createRequests.forEach(req => {
            const found = this._coaAccountsMap.find(value => value.id === req.requestedId);
            if(found) throw new AccountAlreadyExistsError(`Account with requested id: ${req.requestedId} already exists.`);
        });

        const grpcRequest: GrpcControlPlane_CreateAccountsRequestList = {
            requests: createRequests.map(item => {
                return {
                    requestedId: item.requestedId || undefined,
                    ownerId: item.ownerId,
                    type: item.type,
                    currencyCode: item.currencyCode
                };
            })
        };

        await this._startControlPlaneUnaryCall(accessToken);

        return new Promise((resolve, reject) => {
            this._controlPlaneClient.CreateAccounts(grpcRequest, this._callMetadata,
                (err: ServiceError | null, grpcResponseList?: GrpcControlPlane_CreateAccountsResponseList) => {
                    if (err || !grpcResponseList) return reject(err);

                    if (!grpcResponseList.responses) return resolve([]);

                    const resposes: IAnbCreateResponse[] = grpcResponseList.responses.map(grpcResp => {
                        return {
                            requestedId: grpcResp.requestedId || null,
                            attributedId: grpcResp.attributedId!
                        };
                    });

                    return resolve(resposes);
                }
            );
        });
    }

    // async getCoaAccounts(ids:string[]): Promise<IAnbAccount[]>{
    //     throw new Error("not implemented");
    // }

    /*
    ***************************************
    Other - helper methods
    ***************************************
    */
    private _mapGrpcCoaAccountToCoaAccount(coaGrpcAcc: GrpcControlPlane_CoaAccount):ICoaAccount{
        return {
            // from the CoA Account
            id: coaGrpcAcc.id!,
            ledgerAccountId: coaGrpcAcc.ledgerAccountId!,
            type: coaGrpcAcc.type! as AnbAccountType,
            state: coaGrpcAcc.state! as AnbAccountState,
            ownerId: coaGrpcAcc.ownerId!,
            currencyCode: coaGrpcAcc.currencyCode!,
            currencyDecimals: coaGrpcAcc.currencyDecimals!,
            currencyNum: coaGrpcAcc.currencyNum,
        };
    }

    /*
  private _mapLedgerAccountsToAnbAccounts(ledgerAccounts:IAnbAccount[]):IAnbAccount[]{
    const mappedResponse:IAnbAccount[] = ledgerAccounts.map(ledgerAcc => {
        const coaAcc = this._coaAccountsMap.find(item => item.ledgerAccountId === ledgerAcc.id);
        if(!coaAcc){
            throw new AccountNotFoundError(`Account not found on ledger response - ledgerAccountId:${ledgerAcc.id}`);
        }

        // TODO calculate balance
        const balance = "-1";

        const ret:IAnbAccount = {
            // from the CoA Account
            id: coaAcc.id,
            type: coaAcc.type,
            state: coaAcc.state,
            currencyCode: coaAcc.currencyCode,
            ownerId: coaAcc.ownerId,
            balance: balance,
            // from the ledger account response
            pendingDebitBalance: ledgerAcc.pendingDebitBalance,
            postedDebitBalance: ledgerAcc.postedDebitBalance,
            pendingCreditBalance: ledgerAcc.pendingCreditBalance,
            postedCreditBalance: ledgerAcc.postedCreditBalance,
            timestampLastJournalEntry: ledgerAcc.timestampLastJournalEntry
        };
        return ret;
    });
    return mappedResponse;
}

async getAccountsByOwnerIds(ownerIds: string[], accessToken?:string): Promise<IAnbAccount[]> {
    const timerEndFn = this._histo.startTimer({callName: "getAccountsByOwnerIds"});

    try {
        const responses = await this._ledgerDataPlaneClient.getAccountsByOwnerIds(ownerIds, accessToken);
        // remap
        const mappedResponse: IAnbAccount[] = this._mapLedgerAccountsToAnbAccounts(responses);
        timerEndFn({success: "true"});
        return mappedResponse;
    }catch(err:any){
        timerEndFn({success: "false"});
        if(err instanceof AccountNotFoundError) throw err;
        throw new AccountsAndBalancesError(`Error on getAccountsByOwnerIds - msg: ${err?.message || "unknown"}`);
    }
}
*/

    private async _getCoaAccountsByIds(ids: string[], accessToken?:string):Promise<ICoaAccount[]> {
        const timerEndFn = this._histo.startTimer({callName: "_getCoaAccountsByIds"});
        await this._startControlPlaneUnaryCall(accessToken);

        const grpcIdList: GrpcControlPlane_IdList = {
            ids: ids.map(item=>{
                return {id: item};
            })
        };

        return new Promise((resolve, reject) => {
            this._controlPlaneClient.getCoAAccountsByIds(grpcIdList, (err?:Error|null, grpcResponseList?:GrpcControlPlane_CoaAccountList)=>{
                if (err || !grpcResponseList || !grpcResponseList.accounts) {
                    timerEndFn({success: "false"});
                    return reject(err);
                }

                const coaAccounts: ICoaAccount[] = grpcResponseList.accounts.map(this._mapGrpcCoaAccountToCoaAccount);

                timerEndFn({success: "true"});
                return resolve(coaAccounts);
            });
        });
    }

    private _getLocalCoaAccountByIdAndCurrencyCode(coaAccountId:string, currencyCode:string):ICoaAccount | null{
        return this._coaAccountsMap.find(value => value.id === coaAccountId && value.currencyCode === currencyCode) || null;
    }

    private async _getCoaAccount(coaAccountId:string):Promise<ICoaAccount | null>{
        // get the ledgerAccountIds from the coaAccounts cached in this client (only certain types)
        const coaAccount = this._coaAccountsMap.find(item => item.id === coaAccountId);
        if(coaAccount){
            return coaAccount;
        }

        const retCoaAccounts = await this._getCoaAccountsByIds([coaAccountId]);
        if (!retCoaAccounts || retCoaAccounts.length != 1 || !retCoaAccounts[0]) {
            return null;
        }

        return retCoaAccounts[0];
    }

    // used by this.processHighLevelBatch()
    private _getLedgerAccountIdOrThrow(coaAccountId:string, currencyCode:string ): string{
        const coaAccount = this._getLocalCoaAccountByIdAndCurrencyCode(coaAccountId, currencyCode);
        if (!coaAccount) throw new AccountNotFoundError(`Account not found on for coaAccountId: ${coaAccountId} and currencyCode: ${currencyCode}`);
        return coaAccount.ledgerAccountId;
    }
}

