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

import {join, dirname} from "path";
import {
    ChannelCredentials, Metadata,
    sendUnaryData,
    Server,
    ServerCredentials, ServerErrorResponse,
    ServerUnaryCall, status,
    status as GrpcStatus
} from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as grpc from "@grpc/grpc-js";
import {ServerDuplexStream} from "@grpc/grpc-js/build/src/server-call";

import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {AccountsAndBalancesAggregate} from "../../domain/aggregate";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import type {ProtoGrpcType as ControlPlaneProtoGrpcType} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/control_plane";

import {
    AccountNotFoundError, AnbAccountType,
    GRPC_LOAD_PROTO_OPTIONS, GRPC_METADATA_TOKEN_FIELD_KEY,
    IAnbGrpcCertificatesFiles, IAnbCreateAccountRequest, IAnbCreateResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {
    GrpcControlPlaneServiceHandlers
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlaneService";
import {
    GrpcControlPlane_ToClientMsg
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_ToClientMsg";
import {
    GrpcControlPlane_FromClientMsg,
    GrpcControlPlane_FromClientMsg__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_FromClientMsg";
import {
    GrpcControlPlane_LedgerEndpointDetails
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_LedgerEndpointDetails";
import {
    GrpcControlPlane_ToLedgerMsg
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_ToLedgerMsg";
import {
    GrpcControlPlane_FromLedgerMsg,
    GrpcControlPlane_FromLedgerMsg__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_FromLedgerMsg";
import { GrpcControlPlane_BuiltinLedgerEndpoint } from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_BuiltinLedgerEndpoint";
import {ServerInterceptingCall, ServerInterceptingCallInterface} from "@grpc/grpc-js/build/src/server-interceptors";
import {ServerMethodDefinition} from "@grpc/grpc-js/build/src/make-client";
import * as fs from "fs";
import {CallSecurityContext, ForbiddenError, UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {
    GrpcControlPlane_CoaCurrencyList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaCurrencyList";

import {
    GrpcControlPlane_InitialResponseToClient
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_InitialResponseToClient";
import {
    GrpcControlPlane_ClientInitialRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_ClientInitialRequest";
import {
    GrpcControlPlane_LedgerInitialMsg
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_LedgerInitialMsg";

import {
    GrpcControlPlane_CreateAccountsRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsRequestList";
import {
    GrpcControlPlane_CreateAccountsResponseList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsResponseList";
import {Empty__Output} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/google/protobuf/Empty";
import {
    GrpcControlPlane_IdList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_IdList";
import {
    GrpcControlPlane_CreateAccountsResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsResponse";
import {CoaAccount} from "../../domain/coa_account";
import {
    GrpcControlPlane_CoaAccountList, GrpcControlPlane_CoaAccountList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaAccountList";
import {
    GrpcControlPlane_CoaCurrency
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaCurrency";
import {
    GrpcControlPlane_CoaAccount
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaAccount";


const PUBLIC_TYPES_LIB_PATH = require.resolve("@mojaloop/accounts-and-balances-bc-public-types-lib");
const CONTROLPLANE_PROTO_FILE_NAME = "control_plane.proto";

const CLIENT_AUTO_SYNC_ACCOUNT_TYPES: AnbAccountType[] = [
    AnbAccountType.POSITION, AnbAccountType.LIQUIDITY, AnbAccountType.HUB_RECONCILIATION
];

interface IPeer{
    id: string, // ip:port pair as obtained from call.getPeer()
    secCtx: CallSecurityContext
    // serverInterceptingCall: ServerInterceptingCallInterface
}
interface IClientPeer extends IPeer{
    stream?: ServerDuplexStream<GrpcControlPlane_FromClientMsg__Output, GrpcControlPlane_ToClientMsg>
}
interface ILedgerPeer extends IPeer{
    stream?: ServerDuplexStream<GrpcControlPlane_FromLedgerMsg__Output, GrpcControlPlane_ToLedgerMsg>
    instanceId?:string;
    url?:string;
}

export class CoaGrpcServer {
	private readonly _logger: ILogger;
    private readonly _ownServerUrl: string;
	private readonly _aggregate: AccountsAndBalancesAggregate;
    private readonly _tokenHelper: TokenHelper;
    private readonly _server: Server;
    private readonly _ledgerServiceType: "TigerBeetle" | "Builtin";
    private readonly _tigerBeetleReplicaAddresses: string | undefined;
    private readonly _tigerBeetleClusterId: number | undefined;
    //private readonly _builtinLedgerEndpoints: GrpcControlPlane_BuiltinLedgerEndpoint[] = [];
    private readonly _credentials:ServerCredentials;
    private readonly _certFiles: IAnbGrpcCertificatesFiles | undefined = undefined;
    private readonly _histo:IHistogram;

    private _clients: IClientPeer[] = [];
    private _builtinLedgers: ILedgerPeer[] = [];

    private readonly _clientStreamPath:string;
    private readonly _ledgerStreamPath:string;


	constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
        metrics:IMetrics,
		aggregate: AccountsAndBalancesAggregate,
		serverUrl: string,
        ledgerServiceType: "TigerBeetle" | "Builtin",
        tigerBeetleReplicaAddresses?:string,
        tigerBeetleClusterId?: number,
        certs?:IAnbGrpcCertificatesFiles,
	) {
        this._ownServerUrl = serverUrl;
        this._aggregate = aggregate;
		this._logger = logger.createChild(this.constructor.name);
        this._certFiles = certs;
        this._ledgerServiceType = ledgerServiceType;
        this._tokenHelper = tokenHelper;

        if (this._ledgerServiceType === "TigerBeetle"){
            this._tigerBeetleReplicaAddresses = tigerBeetleReplicaAddresses;
            this._tigerBeetleClusterId = tigerBeetleClusterId;
        }

        this._aggregate.setAccountsChangedHandler(this._accountsChangedInAggregate.bind(this));

        const protoFilePath = join(dirname(PUBLIC_TYPES_LIB_PATH), "/proto/", CONTROLPLANE_PROTO_FILE_NAME);

        const packageDefinition = protoLoader.loadSync(protoFilePath, GRPC_LOAD_PROTO_OPTIONS);
        const proto:ControlPlaneProtoGrpcType = grpc.loadPackageDefinition(packageDefinition) as unknown as ControlPlaneProtoGrpcType;
        // store stream paths for later
        this._clientStreamPath = proto.aandb.controlplane.GrpcControlPlaneService.service.ClientStream.path;
        this._ledgerStreamPath = proto.aandb.controlplane.GrpcControlPlaneService.service.LedgerStream.path;

		this._server = new grpc.Server({
            //"grpc.max_concurrent_streams": 1,
            interceptors: [this._getInterceptor.bind(this)],
        });

        if (this._certFiles){
            // server-side TLS
            this._credentials = grpc.ServerCredentials.createSsl(
                null,
                [{
                    private_key: fs.readFileSync(this._certFiles.privateKeyFilePath),
                    cert_chain: fs.readFileSync(this._certFiles.certChainFilePath)
                }],
                true
            );
            /*
            // mTLS
            this._credentials = grpc.ServerCredentials.createSsl(
                fs.readFileSync(this._certFiles.caCertFilePath),
                [{
                    private_key: fs.readFileSync(this._certFiles.privateKeyFilePath),
                    cert_chain: fs.readFileSync(this._certFiles.certChainFilePath)
                }],
                true
            );
            */
        }else{
            this._credentials = grpc.ServerCredentials.createInsecure();
        }

		this._server.addService(proto.aandb.controlplane.GrpcControlPlaneService.service, this._getControlPlaneStreamHandlers());

        this._histo = metrics.getHistogram("GrpcHandler", "GRPC requests handled by the Accounts and Balances CoA GRPC Handler", ["callName", "success"]);
	}



	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this._logger.info(`Starting GRPC service in url: ${this._ownServerUrl}`);
			this._server.bindAsync( this._ownServerUrl, this._credentials, (error) => {
                if (error !== null) {
                    reject(error);
                    return;
                }

                this._logger.info("* * * * * * * * * * * * * * * * * * * *");
                this._logger.info("Accounts and Balances CoA gRPC server started 🚀");
                this._logger.info(`URL: ${this._ownServerUrl}`);
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
				this._logger.info("Accounts and Balances CoA gRPC server stopped 🏁");
				this._logger.info("* * * * * * * * * * * * * * * * * * * *");
				resolve();
			});
		});
	}

    private _notifyBuiltinLedgerEndpointsChanged(){
        // schedule this to 10 ms from now
        setTimeout(()=>{
            const resp:GrpcControlPlane_ToClientMsg = {
                updatedEndpointDetails: this._getEndpointDetails()
            }
            this._clients.forEach((item:IClientPeer) => {
                if(item.stream){
                    item.stream.write(resp);
                    this._logger.debug(`Sent updatedEndpointDetails to ${item.id}`);
                }
            });
        }, 10);
    }

    private _getControlPlaneStreamHandlers(): GrpcControlPlaneServiceHandlers {
        return {
            ClientStream: this._handleClientStream.bind(this),
            LedgerStream: this._handleLedgerStream.bind(this),

            GetCoAAccountsByIds: this._handlerGetCoaAccountsByIds.bind(this),
            CreateAccounts: this._handleCreateAccounts.bind(this),
            ActivateAccountsByIds: this._handleActivateAccountsByIds.bind(this),
            DeactivateAccountsByIds: this._handleDeactivateAccountsByIds.bind(this),
            DeleteAccountsByIds: this._handleDeleteAccountsByIds.bind(this),
        };
    }

    private _getEndpointDetails():GrpcControlPlane_LedgerEndpointDetails{
        const details: GrpcControlPlane_LedgerEndpointDetails = {};
        if (this._ledgerServiceType === "TigerBeetle"){
            details.tigerBeetleInfo = {
                clusterId: this._tigerBeetleClusterId,
                replicas: this._tigerBeetleReplicaAddresses
            }
        }else{ // assume builtin
            const endpoints:GrpcControlPlane_BuiltinLedgerEndpoint[] = this._builtinLedgers.map(ledger =>{
                return {
                    instanceId: ledger.instanceId,
                    url: ledger.url
                };
            });
            details.builtinLedgerEndpoints = {
                endpoints: endpoints || []
            }
        }
        return details;
    }

    private _coaAccountToGrpc(account:CoaAccount):GrpcControlPlane_CoaAccount{
        return {
            id: account.id,
            type: account.type,
            state: account.state,
            currencyCode: account.currencyCode,
            currencyDecimals: account.currencyDecimals,
            ownerId: account.ownerId,
            ledgerAccountId: account.ledgerAccountId
        };
    }

    /**
     * Returns the CoA Accounts matching CLIENT_AUTO_SYNC_ACCOUNT_TYPES in GRPC response format
     * @private
     */
    private async _getAutoSyncCoaAccountMap():Promise<GrpcControlPlane_CoaAccountList>{
        const accounts = await this._aggregate.getCoaAccountsByTypes(CLIENT_AUTO_SYNC_ACCOUNT_TYPES);
        const retAccounts:GrpcControlPlane_CoaAccountList = {
            accounts: accounts.map(this._coaAccountToGrpc)
        };
        return retAccounts;
    }

    /*
    * Server interceptor methods
    * */

    private _getInterceptor(methodDescriptor: ServerMethodDefinition<any, any>, call: ServerInterceptingCallInterface):ServerInterceptingCall{
        return new ServerInterceptingCall(call, {
            start: next => {
                const peerId = call.getPeer();
                this._logger.debug(`Server interceptor connection from ${peerId} - methodDescriptor: ${methodDescriptor.path}`);
                const authListener: grpc.ServerListener = {
                    onReceiveMetadata: this._onReceiveStartMetadata.bind(this, call, methodDescriptor),
                    onCancel: this._onStartCancel.bind(this, peerId, methodDescriptor),
                    onReceiveHalfClose: (next1) => {
                        this._logger.debug(`start - onReceiveHalfClose `);
                        next1();
                    }
                };
                next(authListener);
            },
            /*sendStatus: (status1, next) => {
                this._logger.debug(`sendStatus: ${JSON.stringify(status1)}`);
                next(status1);
            },
            sendMessage: (message, next) => {
                // this._logger.debug(`,: ${JSON.stringify(message)}`);
                next(message);
            },
            sendMetadata: (metadata, next) => {
                this._logger.debug(`sendMetadata: ${JSON.stringify(metadata)}`);
                next(metadata);
            }*/
        });
    }

    /**
     * Process metadata / authenticate streams (received on first req)
     * Will get and parse the token and create a rec for the _clients and _builtinLedgers with the secCtx and peerId
      */
    private async _onReceiveStartMetadata(call: ServerInterceptingCallInterface, methodDescriptor: ServerMethodDefinition<any, any>, metadata:Metadata, mdNext: (metadata: Metadata) => void):Promise<void>{
        this._logger.debug(`Start client call onReceiveMetadata: ${call.getPeer()} - path: ${methodDescriptor.path} `);

        try {
            const peerId = call.getPeer();

            // if we got here we have a secCtx, add the peer entry to the clients/ledgers array
            if(methodDescriptor.requestStream && methodDescriptor.path === this._clientStreamPath) {
                const secCtx = await this._getSecCtxFromMetadata(metadata);
                const foundIndex = this._clients.findIndex(item => item.id === peerId);
                if (foundIndex >= 0) this._clients.splice(foundIndex, 1);
                this._clients.push({
                    id: peerId,
                    // serverInterceptingCall: call,
                    secCtx: secCtx
                });
            }else if (methodDescriptor.requestStream && methodDescriptor.path === this._ledgerStreamPath){
                const secCtx = await this._getSecCtxFromMetadata(metadata);
                const foundIndex = this._builtinLedgers.findIndex(item => item.id === peerId);
                if (foundIndex >= 0) this._builtinLedgers.splice(foundIndex, 1);
                this._builtinLedgers.push({
                    id: peerId,
                    // serverInterceptingCall: call,
                    secCtx: secCtx
                });
            }else{
                // unary calls, can only be from client
                //metadata.set("secCtx", secCtx);

                // return call.sendStatus({
                //     code: GrpcStatus.NOT_FOUND,
                //     details: "Unauthorised Stream"
                // });
            }

            mdNext(metadata);
        }catch(error:any){
            if (error instanceof UnauthorizedError) {
                this._logger.info(`Unauthorised Stream from client - peer: ${call.getPeer()} - ${error.message}`);
                call.sendStatus({
                    code: GrpcStatus.UNAUTHENTICATED,
                    details: error.message ?? "Unauthorised Stream"
                });
            }else{
                this._logger.info(`Unknown Error in Stream from client - peer: ${call.getPeer()} - ${error.message}`);
                call.sendStatus({
                    code: GrpcStatus.UNKNOWN,
                    details: error.message ?? "Unknown Error in Stream"
                });
            }
        }
    }

    private async _onStartCancel(peerId:string, methodDescriptor: ServerMethodDefinition<any, any>):Promise<void>{
        this._logger.debug(`onStartCancel - ${peerId} path: ${methodDescriptor.path} `);

        if(methodDescriptor.requestStream && methodDescriptor.path === this._clientStreamPath) {
            const foundIndex = this._clients.findIndex(item => item.id === peerId);
            if (foundIndex >= 0) this._clients.splice(foundIndex, 1);
        }else if (methodDescriptor.requestStream && methodDescriptor.path === this._ledgerStreamPath){
            // store it
            const foundLedger = this._builtinLedgers.find(item => item.id === peerId);

            const foundIndex = this._builtinLedgers.findIndex(item => item.id === peerId);
            if (foundIndex >= 0) this._builtinLedgers.splice(foundIndex, 1);

            if(foundLedger) {
                this._logger.info(`Ledger with instance id: ${foundLedger.id} left - ledgerCount: ${this._builtinLedgers.length}`);
            }
            // no need to notify clients here, stream was never started... would be premature
        }else{
           // don't care
        }

    }

    /*
    * Client Stream methods
   * */

    private async _handleClientStream(call:ServerDuplexStream<GrpcControlPlane_FromClientMsg__Output, GrpcControlPlane_ToClientMsg>): Promise<void>{
        this._logger.debug(`Got new stream from client - peer: ${call.getPeer()} and path: ${call.getPath()}`);

        try{
            const clientPeerRec = this._clients.find(item => item.id === call.getPeer());
            if(!clientPeerRec) throw new Error("IClientPeer not found in _handleClientStream()");

            clientPeerRec.stream = call;

            call.on("data", async (request:GrpcControlPlane_FromClientMsg) => {
                await this._handleClientOnData(clientPeerRec, request);
            });

            call.on("end", () => {
                this._logger.debug(`Got on end from peer: ${clientPeerRec.id} and path: ${call.getPath()}`)
                call.destroy();
                const index = this._clients.findIndex(item=>item.id === clientPeerRec.id);
                if (index >= 0) this._clients.splice(index,1);
            });
            call.on("error", (error) => {
                this._logger.debug(`on error: ${JSON.stringify(error)} peer: ${clientPeerRec.id} and path: ${call.getPath()}`)
            })
        }catch (error:any){
            this._logger.info(`Unknown Stream error from client - peer: ${call.getPeer()} and path: ${call.getPath()} - ${error.message}`);
            call.emit("error", {
                code: GrpcStatus.UNKNOWN,
                message: error.message
            });
        }
    }

    private async _handleClientOnData(clientPeerRec:IClientPeer, request:GrpcControlPlane_FromClientMsg):Promise<void>{
        // let it throw if no stream, will be caught in the _handleClientStream
        const stream:ServerDuplexStream<GrpcControlPlane_FromClientMsg__Output, GrpcControlPlane_ToClientMsg> = clientPeerRec.stream!;

        try {
            // which request did we get in the stream?
            if (request.initialRequest) {
                const response: GrpcControlPlane_InitialResponseToClient = await this._handleClientInitialRequest(clientPeerRec, request.initialRequest as GrpcControlPlane_ClientInitialRequest);
                stream.write(response);
            } else {
                this._logger.debug(new Error("invalid client request"));
                throw new Error("Unknown client request")
            }
        }catch (error:any) {
            if (error instanceof UnauthorizedError) {
                this._logger.info(`Unauthorised Stream from client - peer: ${stream.getPeer()} and path: ${stream.getPath()} - ${error.message}`);
                stream.emit("error", {
                    code: GrpcStatus.UNAUTHENTICATED,
                    message: error.message
                });
            }else if (error instanceof ForbiddenError) {
                this._logger.info(`ForbiddenError Stream from client - peer: ${stream.getPeer()} and path: ${stream.getPath()} - ${error.message}`);
                stream.emit("error", {
                    code: GrpcStatus.PERMISSION_DENIED,
                    message: error.message
                });
            }else{
                this._logger.info(`Unknown Stream from client - peer: ${stream.getPeer()} and path: ${stream.getPath()} - ${error.message}`);
                stream.emit("error", {
                    code: GrpcStatus.UNKNOWN,
                    message: error.message
                });
            }
        }
    }

    private async _handleClientInitialRequest(clientPeerRec:IClientPeer, request:GrpcControlPlane_ClientInitialRequest):Promise<GrpcControlPlane_InitialResponseToClient>{
        const ledgerEndpointDetails = this._getEndpointDetails();
        const accounts = await this._getAutoSyncCoaAccountMap();

        const enabledCurrencies = await this._aggregate.getCoaActiveCurrencies();
        const coaCurrencyList:GrpcControlPlane_CoaCurrencyList = {
            list: enabledCurrencies.map(cur=>{
                return{
                    code: cur.code,
                    num: cur.num,
                    decimals: cur.decimals
                }
            })
        }

        const resp:GrpcControlPlane_ToClientMsg = {
            initialResponse: {
                ledgerServiceType: this._ledgerServiceType === "TigerBeetle" ? "TigerBeetle" : "BuiltinGrpc",
                ledgerEndpointDetails: ledgerEndpointDetails,
                accountMap: accounts,
                coaCurrencies: coaCurrencyList
            }
        };

        return resp;
    }

    /*
    * Ledger Stream methods
    * */

    private _handleLedgerStream(call: ServerDuplexStream<GrpcControlPlane_FromLedgerMsg__Output, GrpcControlPlane_ToLedgerMsg>):void{
        this._logger.debug(`Got new stream from builtinLedger - peer: ${call.getPeer()} and path: ${call.getPath()}`);

        try{
            const ledgerPeerRec = this._builtinLedgers.find(item => item.id === call.getPeer());
            if (!ledgerPeerRec) throw new Error("ILedgerPeer not found in _handleLedgerStream()");

            ledgerPeerRec.stream = call;

            call.on("data", async (request: GrpcControlPlane_FromLedgerMsg) => {
                await this._handleLedgerOnData(ledgerPeerRec, request);
            });

            call.on("end", () => {
                this._logger.debug(`Got on end from ledger: ${ledgerPeerRec.id} and path: ${call.getPath()}`)
                const index = this._builtinLedgers.findIndex(item=>item.id === ledgerPeerRec.id);
                if (index >= 0) {
                    this._clients.splice(index, 1);
                    this._notifyBuiltinLedgerEndpointsChanged();
                }

                call.destroy();
            });
            call.on("error", (error) => {
                this._logger.debug(`builtinLedgerStream - on error: ${JSON.stringify(error)} peer: ${call.getPeer()} and path: ${call.getPath()}`)
            });
        }catch(error:any){
            this._logger.info(`Unknown Stream error from ledger - peer: ${call.getPeer()} and path: ${call.getPath()} - ${error.message}`);
            call.emit("error", {
                code: GrpcStatus.UNKNOWN,
                message: error.message
            });
        }
    }

    private async _handleLedgerOnData(ledgerPeerRec:ILedgerPeer, request: GrpcControlPlane_FromLedgerMsg):Promise<void>{
        // let it throw if no stream, will be caught in the _handleClientStream
        const stream:ServerDuplexStream<GrpcControlPlane_FromLedgerMsg__Output, GrpcControlPlane_ToLedgerMsg> = ledgerPeerRec.stream!;

        try {
            // which request did we get in the stream?
            if (request.initialMsg) {
                const response: GrpcControlPlane_ToLedgerMsg = await this._handleLedgerInitialRequest(ledgerPeerRec, request.initialMsg as GrpcControlPlane_LedgerInitialMsg);
                stream.write(response);
            } else {
                this._logger.debug(new Error("invalid ledger request"));
                throw new Error("Unknown ledger request")
            }
        }catch (error:any) {
            if (error instanceof UnauthorizedError) {
                this._logger.info(`Unauthorised Stream from ledger - peer: ${stream.getPeer()} and path: ${stream.getPath()} - ${error.message}`);
                stream.emit("error", {
                    code: GrpcStatus.UNAUTHENTICATED,
                    message: error.message
                });
            }else if (error instanceof ForbiddenError) {
                this._logger.info(`ForbiddenError Stream from ledger - peer: ${stream.getPeer()} and path: ${stream.getPath()} - ${error.message}`);
                stream.emit("error", {
                    code: GrpcStatus.PERMISSION_DENIED,
                    message: error.message
                });
            }else{
                this._logger.info(`Unknown Stream from ledger - peer: ${stream.getPeer()} and path: ${stream.getPath()} - ${error.message}`);
                stream.emit("error", {
                    code: GrpcStatus.UNKNOWN,
                    message: error.message
                });
            }
        }
    }

    private async _handleLedgerInitialRequest(ledgerPeerRec:ILedgerPeer, request: GrpcControlPlane_LedgerInitialMsg):Promise<GrpcControlPlane_ToLedgerMsg>{
        this._logger.isDebugEnabled() && this._logger.debug(request);

        if (!request.instanceId || !request.address) {
           throw new Error("Invalid instanceId or address in initialMsg");
        }

        // update endpoint list and trigger new send to clients
        let peerIp = ledgerPeerRec.id.split((":"))[0];
        let ledgerUrl = request.address;
        // replace "0.0.0.0" with the peer ip
        if (ledgerUrl.includes("0.0.0.0")) {
            ledgerUrl = ledgerUrl.replace("0.0.0.0", peerIp);
        }

        ledgerPeerRec.url = ledgerUrl;
        ledgerPeerRec.instanceId = request.instanceId;

        this._logger.info(`New Ledger registered with instance id: ${request.instanceId} and url: ${ledgerUrl} - ledgerCount: ${this._builtinLedgers.length}`);

        this._notifyBuiltinLedgerEndpointsChanged();

        // send welcome/empty msg
        const resp: GrpcControlPlane_ToLedgerMsg = {
            welcomeMsg: "welcome!"
        };
        return resp;
    }

    /*
    * Account Management Unary calls methods
    * */

    private _accountsChangedInAggregate(changedAccounts:CoaAccount[]):void{
        // this is called from the aggregate whenever any accounts change, send new maps - schedule this to 10 ms from now
        setTimeout(async ()=>{
            const interesting = changedAccounts.filter(value => CLIENT_AUTO_SYNC_ACCOUNT_TYPES.includes(value.type));
            if(!interesting) return;

            const accounts = await this._getAutoSyncCoaAccountMap();
            const resp:GrpcControlPlane_ToClientMsg = {
                accountMap: accounts
            }

            this._clients.forEach((item:IClientPeer) => {
                if(item.stream){
                    item.stream.write(resp);
                    this._logger.debug(`Sent updated accountMap to ${item.id}`);
                }
            });
        }, 10);
    }

    private async _handlerGetCoaAccountsByIds(
        call: ServerUnaryCall<GrpcControlPlane_IdList, GrpcControlPlane_CoaAccountList__Output>,
        callback: sendUnaryData<GrpcControlPlane_CoaAccountList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromMetadataAndRespondOnError(call.metadata, callback);
        if(!secCtx) return; // callback was called by _getSecCtxFromCall()

        const reqIds = call.request.ids || [];
        if(!reqIds.length){
            callback(null, {accounts: []});
            return;
        }

        const ids:string[] = reqIds.map(value => {
            if(value.id === undefined) throw new Error("Invalid requested id in _handlerGetCoAAccountsByIds;")
            return value.id;
        });

        const accounts = await this._aggregate.getCoaAccountsByIds(secCtx, ids);

        const retAccounts:GrpcControlPlane_CoaAccountList__Output = {
            accounts: accounts.map(this._coaAccountToGrpc)
        };

        callback(null, retAccounts);
    }

    private async _handleCreateAccounts(
        call: ServerUnaryCall<GrpcControlPlane_CreateAccountsRequestList, GrpcControlPlane_CreateAccountsResponseList__Output>,
        callback: sendUnaryData<GrpcControlPlane_CreateAccountsResponseList__Output>
    ): Promise<void> {
        const secCtx = await this._getSecCtxFromMetadataAndRespondOnError(call.metadata, callback);
        if(!secCtx) return; // callback was called by _getSecCtxFromCall()

        const requests = call.request.requests || [];

        // we can use the ! here as the aggregate will validate everything
        const createAccountReqs: IAnbCreateAccountRequest[] = requests.map(value => {
            return {
                requestedId: value.requestedId!,
                ownerId: value.ownerId!,
                type: value.type! as AnbAccountType,
                currencyCode: value.currencyCode!
            };
        });

        let accountIds: IAnbCreateResponse[];
        try {
            accountIds = await this._aggregate.createAccounts(secCtx, createAccountReqs);
        } catch (error: unknown) {
            return callback(this._handleAggregateError(error));
        }

        const responses: GrpcControlPlane_CreateAccountsResponse[] = accountIds.map(value => {
            return {
                requestedId: value.requestedId!,
                attributedId: value.attributedId!,

            };
        });
        callback(null, {responses: responses});
    }

    private async _handleActivateAccountsByIds(
        call: ServerUnaryCall<GrpcControlPlane_IdList, Empty__Output>,
        callback: sendUnaryData<Empty__Output>
    ): Promise<void>{
        throw new Error("Not implemented");
    }

    private async _handleDeactivateAccountsByIds(
        call: ServerUnaryCall<GrpcControlPlane_IdList, Empty__Output>,
        callback: sendUnaryData<Empty__Output>
    ): Promise<void>{
        throw new Error("Not implemented");
    }

    private async _handleDeleteAccountsByIds(
        call: ServerUnaryCall<GrpcControlPlane_IdList, Empty__Output>,
        callback: sendUnaryData<Empty__Output>
    ): Promise<void>{
        throw new Error("Not implemented");
    }
    /*
    * generic helpers
    * */

    private async _getSecCtxFromMetadataAndRespondOnError(metadata: Metadata, callback: sendUnaryData<any>): Promise<CallSecurityContext | null> {
        try {
            const secctx = await this._getSecCtxFromMetadata(metadata);
            return secctx;
        }catch(error:any) {
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

            callback(srvError);
            return null;
        }
    }

    private async _getSecCtxFromMetadata(metadata: Metadata): Promise<CallSecurityContext> {
        const callTokenMeta = metadata.get(GRPC_METADATA_TOKEN_FIELD_KEY);
        if (!callTokenMeta) throw new UnauthorizedError("Could not get token from call metadata");

        const bearerToken = callTokenMeta[0] as string;
        if (!bearerToken) throw new UnauthorizedError("Could not get token from call metadata array (metadata key exists)");

        try{
            const callSecCtx: CallSecurityContext | null = await this._tokenHelper.getCallSecurityContextFromAccessToken(bearerToken);
            if (!callSecCtx) throw new UnauthorizedError("Unable to verify or decodeToken token");
            return callSecCtx;
        }catch (error){
            this._logger.error(error);
            throw new UnauthorizedError("Failed in getCallSecurityContextFromAccessToken");
        }
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
