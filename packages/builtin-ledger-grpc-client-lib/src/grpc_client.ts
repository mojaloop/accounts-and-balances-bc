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


import {join} from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import {
    BuiltinLedgerGrpcAccountArray__Output,
    BuiltinLedgerGrpcCreateAccountArray,
    BuiltinLedgerGrpcCreateIdsResponse__Output,
    BuiltinLedgerGrpcCreateJournalEntryArray,
    BuiltinLedgerGrpcHighLevelRequestArray,
    BuiltinLedgerGrpcId,
    BuiltinLedgerGrpcIdArray,
    BuiltinLedgerGrpcIdArray__Output,
    BuiltinLedgerGrpcJournalEntryArray__Output,
    GrpcBuiltinLedgerClient,
    ProtoGrpcType
} from "./types";

import {
    AccountsBalancesHighLevelRequestTypes,
    IAccountsBalancesHighLevelRequest,
    IAccountsBalancesHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ConnectivityState} from "@grpc/grpc-js/build/src/connectivity-state";

const PROTO_FILE_NAME = "builtin_ledger.proto";
const LOAD_PROTO_OPTIONS: protoLoader.Options = {
	longs: Number
};
const TIMEOUT_MS: number = 5_000;

export class BuiltinLedgerGrpcClient {
	private readonly _logger: ILogger;
	private readonly _callMetadata: grpc.Metadata;
	private readonly _loginHelper: LoginHelper;
	private readonly _client: GrpcBuiltinLedgerClient;
	private readonly _url: string;

    // private _pendingRequests = new Map<string, {req: HighLevelStreamRequest, resolve: ()=>void }>();
    // private _stream: ClientDuplexStream<HighLevelStreamRequest, HighLevelStreamResponse>;

	constructor(url: string, loginHelper: LoginHelper, logger: ILogger) {
		this._logger = logger.createChild(this.constructor.name);
		this._loginHelper = loginHelper;
		this._url = url;

		const protoFileAbsolutePath: string = join(__dirname, PROTO_FILE_NAME);
		const packageDefinition: protoLoader.PackageDefinition = protoLoader.loadSync(
			protoFileAbsolutePath,
			LOAD_PROTO_OPTIONS
		);
		const grpcObject: grpc.GrpcObject = grpc.loadPackageDefinition(packageDefinition);


/*
        // # ref https://grpc.io/docs/guides/auth/#with-server-authentication-ssltls-and-a-custom-header-with-token-1
        const channelCreds = grpc.credentials.createInsecure();
        const callCreds = grpc.credentials.createFromMetadataGenerator(this._metadataCallback.bind(this));
        const combindedCreds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
*/

		this._callMetadata = new grpc.Metadata();
		this._client = new (grpcObject as unknown as ProtoGrpcType).GrpcBuiltinLedger(
			this._url,
			grpc.credentials.createInsecure(),
            {
                // send keepalive ping every 10 second, default is 2 hours
                "grpc.keepalive_time_ms": 10000,
                // keepalive ping timeout after 5 seconds, default is 20 seconds
                "grpc.keepalive_timeout_ms": 5000,
                // allow keepalive pings when there's no gRPC calls
                "grpc.keepalive_permit_without_calls": 1,
                /*
                  0: multi clients use global sub-channel pool
                  1: applications with high load or long-lived streaming RPCs use local sub-channel will earn performance
                */
                "grpc.use_local_subchannel_pool": 0,
                /*
                    0: no compression
                    1: deflate
                    2: gzip
                    3: gzip stream
                */
                "grpc.default_compression_algorithm": 2,
                /*
                    0: none
                    1: low level (gzip-3)
                    2: medium level (gzip-6)
                    3: high level (gzip-9)
                */
                "grpc.default_compression_level": 2
            }
            // combindedCreds
		);
	}

/*    private _metadataCallback(params: CallMetadataOptions, callback: (err: (Error | null), metadata?: grpc.Metadata) =>void):void {
        const meta: grpc.Metadata = new grpc.Metadata();

        this._loginHelper.getToken().then(token => {
            meta.add("TOKEN", token.accessToken);
            callback(null, meta);
        }).catch(reason => {
            const err = new Error(`Could not get token in BuiltinLedgerGrpcClient: ${reason.toString()}`);
            this._logger.error(err);
            callback(err);
        });
    }*/

	private async _updateCallMetadata(): Promise<void> {
		// this can throw and UnauthorizedError, let it
		const token = await this._loginHelper.getToken();
		//this._callMetadata.remove("TOKEN");
		this._callMetadata.set("TOKEN", token.accessToken);
		return Promise.resolve();
	}

	async init(): Promise<void> {
		// we don't use credentials here, but want to try fetching a token to fail early
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._logger.info(`Connecting BuiltinLedgerGrpcClient to url: ${this._url}`);

			const deadline: grpc.Deadline = Date.now() + TIMEOUT_MS;
			this._client.waitForReady(deadline, (error) => {
				if (error) return reject(error);

                const channelzRf = this._client.getChannel().getChannelzRef();
                this._logger.info(`BuiltinLedgerGrpcClient initialized 🚀 - channel: ${channelzRf.name}`);

                const channel =this._client.getChannel();
                let currentState: ConnectivityState, lastState: ConnectivityState;
                currentState = lastState = channel.getConnectivityState(false);

                const updateLoop = ()=>{
                    if(lastState !== ConnectivityState.READY && lastState !== ConnectivityState.CONNECTING) {
                        channel.getConnectivityState(true);
                    }
                    channel.watchConnectivityState(lastState, Date.now() + TIMEOUT_MS, error1 => {
                        if(!error1){
                            currentState = channel.getConnectivityState(false);
                            this._logger.info(`BuiltinLedgerGrpcClient channel state changed - last state: ${ConnectivityState[lastState]} -> new state: ${ConnectivityState[currentState]}`);
                            lastState = currentState;
                        }
                        setImmediate(updateLoop);
                    });
                };

                // start the update loop
                updateLoop();

                resolve();

                /*if(!this._stream){
                    this._stream = this._client.streamRequest();
                }

                this._stream.on("data", (data) => {
                    const resp: HighLevelStreamResponse = data.toJSON();
                    if(!resp.requestId){
                        const err = new Error("HighLevelStreamResponse does not contain requestId in BuiltinLedgerGrpcClient._pendingRequests");
                        this._logger.error(err);
                        throw err;
                    }

                    const foundRequest = this._pendingRequests.get(resp.requestId);
                    if(!foundRequest){
                        const err = new Error("request not found in BuiltinLedgerGrpcClient._pendingRequests");
                        this._logger.error(err);
                        throw err;
                    }
                    foundRequest.resolve();
                    this._pendingRequests.delete(resp.requestId);
                }).on("end", () => {
                    console.log("checkLiquidAndReserve.streamRequest.end");
                });*/


			});
		});
	}

	async destroy(): Promise<void> {
        // if(this._stream) this._stream.end();

		this._client.close();
		this._logger.info("gRPC client destroyed 🏁");
	}

	async createAccounts(accountCreates: BuiltinLedgerGrpcCreateAccountArray): Promise<BuiltinLedgerGrpcCreateIdsResponse__Output> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createAccounts(accountCreates, this._callMetadata, (error, idsResponse) => {
				if (error || !idsResponse) return reject(error);
				resolve(idsResponse);
				}
			);
		});
	}

	async createJournalEntries(entryCreates: BuiltinLedgerGrpcCreateJournalEntryArray): Promise<BuiltinLedgerGrpcIdArray__Output> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createJournalEntries(entryCreates, this._callMetadata, (error, idsResponse) => {
					if (error || !idsResponse) return reject(error);
					resolve(idsResponse);
				}
			);
		});
	}

	async getAccountsByIds(accountIds: BuiltinLedgerGrpcIdArray): Promise<BuiltinLedgerGrpcAccountArray__Output> {
		await this._updateCallMetadata();

		return new Promise( (resolve, reject) => {
			this._client.getAccountsByIds(accountIds, this._callMetadata, (error, resp) => {
					if (error || !resp) return reject(error);
					resolve(resp);
				}
			);
		});
	}

	async getJournalEntriesByAccountId(accountId: BuiltinLedgerGrpcId): Promise<BuiltinLedgerGrpcJournalEntryArray__Output> {
		await this._updateCallMetadata();

		return new Promise( (resolve, reject) => {
			this._client.getJournalEntriesByAccountId(accountId, this._callMetadata, (error, resp) => {
				if (error || !resp) return reject(error);
				resolve(resp);
			});
		});
	}

	async deleteAccountsByIds(accountsArray: BuiltinLedgerGrpcIdArray): Promise<void> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.deleteAccountsByIds(accountsArray, this._callMetadata, (error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async deactivateAccountsByIds(accountsArray: BuiltinLedgerGrpcIdArray): Promise<void> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.deactivateAccountsByIds(accountsArray, this._callMetadata,(error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async activateAccountsByIds(accountsArray: BuiltinLedgerGrpcIdArray	): Promise<void> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.activateAccountsByIds(accountsArray, this._callMetadata,(error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

    // High level

    async processHighLevelBatch(requests:IAccountsBalancesHighLevelRequest[]): Promise<IAccountsBalancesHighLevelResponse[]>{
        const grpcRequests:BuiltinLedgerGrpcHighLevelRequestArray = {
            requestArray: []
        };

        requests.forEach(req =>{
            grpcRequests.requestArray!.push({
                requestType: req.requestType,
                requestId: req.requestId,
                transferId: req.transferId,
                payerPositionAccountId: req.payerPositionAccountId,
                hubJokeAccountId: req.hubJokeAccountId,
                transferAmount: req.transferAmount,
                currencyCode: req.currencyCode,
                payerLiquidityAccountId: req.payerLiquidityAccountId || undefined,
                payeePositionAccountId: req.payeePositionAccountId || undefined,
                payerNetDebitCap: req.payerNetDebitCap || undefined
            });
        });

        await this._updateCallMetadata();

        return new Promise((resolve, reject) => {
            this._client.processHighLevelBatch(grpcRequests, this._callMetadata, (error, grpcResponse)=>{
                if (error) return reject(error);
                if(!grpcResponse || !grpcResponse.responseArray)
                    return reject(new Error("invalid response on processHighLevelBatch"));

                const responses:IAccountsBalancesHighLevelResponse[] = [];
                grpcResponse.responseArray.forEach((item)=>{
                    if(!item.requestId ||(
                        item.requestType !== AccountsBalancesHighLevelRequestTypes.checkLiquidAndReserve &&
                        item.requestType !== AccountsBalancesHighLevelRequestTypes.cancelReservationAndCommit &&
                        item.requestType !== AccountsBalancesHighLevelRequestTypes.cancelReservation
                    )){
                        const error = new Error("invalid response on processHighLevelBatch - item does not contain requestId or requestType");
                        this._logger.error(error);
                        this._logger.isDebugEnabled() && this._logger.debug(JSON.stringify(item, null, 2));
                        return reject(error);
                    }

                    responses.push({
                        requestType: item.requestType as AccountsBalancesHighLevelRequestTypes,
                        requestId: item.requestId,
                        success: item.success || false,
                        errorMessage: item.errorMessage || null
                    });
                });

                return resolve(responses);
            });
        });
    }

/*


    async checkLiquidAndReserve(
        payerPositionAccountId: string, payerLiquidityAccountId: string, hubJokeAccountId: string,
        transferAmount: string, currencyCode: string, payerNetDebitCap: string, transferId: string
    ): Promise<void>{

        const req: BuiltinLedgerGrpcCheckLiquidAndReserveRequest = {
            payerPositionAccountId: payerPositionAccountId,
            payerLiquidityAccountId: payerLiquidityAccountId,
            hubJokeAccountId: hubJokeAccountId,
            currencyCode: currencyCode,
            payerNetDebitCap:payerNetDebitCap,
            transferAmount: transferAmount,
            transferId: transferId
        };

        return new Promise<void>((resolve, reject) => {
            const id = randomUUID();
            const streamRequest: HighLevelStreamRequest = {
                requestType: 0,
                requestId: id,
                ...req
            };

            this._pendingRequests.set(id, {req: streamRequest, resolve: resolve});

            this._stream.write(streamRequest);
        });


//        stream.end();

        /!*await this._updateCallMetadata();
        return new Promise((resolve, reject) => {
            this._client.checkLiquidAndReserve(req, this._callMetadata, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });*!/
    }

    async cancelReservationAndCommit(
        payerPositionAccountId: string, payeePositionAccountId: string, hubJokeAccountId: string,
        transferAmount: string, currencyCode: string, transferId: string
    ): Promise<void> {
        const req: BuiltinLedgerGrpcCancelReservationAndCommitRequest = {
            payerPositionAccountId: payerPositionAccountId,
            payeePositionAccountId: payeePositionAccountId,
            hubJokeAccountId: hubJokeAccountId,
            currencyCode: currencyCode,
            transferAmount: transferAmount,
            transferId: transferId
        };

        return new Promise<void>((resolve, reject) => {
            const id = randomUUID();
            const streamRequest: HighLevelStreamRequest = {
                requestType: 1,
                requestId: id,
                ...req
            };

            this._pendingRequests.set(id, {req: streamRequest, resolve: resolve});

            this._stream.write(streamRequest);
        });

       /!* await this._updateCallMetadata();
        return new Promise((resolve, reject) => {
            this._client.cancelReservationAndCommit(req, this._callMetadata, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });*!/
    }

    async cancelReservation(
        payerPositionAccountId: string, hubJokeAccountId: string,
        transferAmount: string, currencyCode: string, transferId: string
    ): Promise<void> {
        const req: BuiltinLedgerGrpcCancelReservationRequest = {
            payerPositionAccountId: payerPositionAccountId,
            hubJokeAccountId: hubJokeAccountId,
            currencyCode: currencyCode,
            transferAmount: transferAmount,
            transferId: transferId
        };

        await this._updateCallMetadata();
        return new Promise((resolve, reject) => {
            this._client.cancelReservation(req, this._callMetadata, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });
    }

*/


}
