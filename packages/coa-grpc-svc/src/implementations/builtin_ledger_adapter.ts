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
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {dirname, join} from "path";
import * as protoLoader from "@grpc/proto-loader";
import {
    GRPC_LOAD_PROTO_OPTIONS
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import * as grpc from "@grpc/grpc-js";
import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import {
    ILedgerAdapter,
    ILedgerAdapterCreateAccountRequestItem,
    ILedgerAdapterCreateAccountResponseItem,
} from "../domain/infrastructure-types/ledger_adapter";

import type {
    ProtoGrpcType as DataPlaneProtoGrpcType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/builtin_ledger";
import {ConnectivityState} from "@grpc/grpc-js/build/src/connectivity-state";

import {
    GrpcControlPlane_CreateAccountsRequestList
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsRequestList";
import {
    GrpcBuiltinLedgerServiceClient
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/builtinledger/GrpcBuiltinLedgerService";
import {
    GrpcControlPlane_CreateAccountsResponseList__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/GrpcControlPlane_CreateAccountsResponseList";


const PUBLIC_TYPES_LIB_PATH = require.resolve("@mojaloop/accounts-and-balances-bc-public-types-lib");
const PROTO_FILE_NAME = "builtin_ledger.proto";

const DEFAULT_GRPC_CONNECT_TIMEOUT_MS = 5_000;

export class BuiltinLedgerAdapter implements ILedgerAdapter {
	private readonly _logger: ILogger;
	private readonly _loginHelper: LoginHelper;
    private readonly _callMetadata: grpc.Metadata;
    private readonly _grpcServiceUrl: string;
    private readonly _grpcConnectTimeOutMs: number;
    private readonly _grpcLedgerClient:GrpcBuiltinLedgerServiceClient ;
    private readonly _grpcProto: DataPlaneProtoGrpcType;

	constructor(url: string, loginHelper: LoginHelper, logger: ILogger, grpcConnectTimeOutMs: number = DEFAULT_GRPC_CONNECT_TIMEOUT_MS) {
		this._logger = logger.createChild(this.constructor.name);
		this._loginHelper = loginHelper;
        this._grpcServiceUrl = url;
        this._grpcConnectTimeOutMs = grpcConnectTimeOutMs;
        this._callMetadata = new grpc.Metadata();

        const protoFilePath = join(dirname(PUBLIC_TYPES_LIB_PATH), "/proto/", PROTO_FILE_NAME);

        const dataPlanePackageDefinition = protoLoader.loadSync(protoFilePath, GRPC_LOAD_PROTO_OPTIONS);
        this._grpcProto = grpc.loadPackageDefinition(dataPlanePackageDefinition) as unknown as DataPlaneProtoGrpcType;

        // instantiate grpc client
        this._grpcLedgerClient = new this._grpcProto.aandb.builtinledger.GrpcBuiltinLedgerService(
            this._grpcServiceUrl,
            grpc.credentials.createInsecure()
        );
	}

	async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const deadline: grpc.Deadline = Date.now() + this._grpcConnectTimeOutMs;
            this._grpcLedgerClient.waitForReady(deadline, (error?:Error) => {
                if (error)
                    return reject(error);

                const channelzRf = this._grpcLedgerClient.getChannel().getChannelzRef();

                const channel =this._grpcLedgerClient.getChannel();
                let currentState: ConnectivityState, lastState: ConnectivityState;
                currentState = lastState = channel.getConnectivityState(false);

                const updateLoop = ()=>{
                    if(lastState !== ConnectivityState.READY && lastState !== ConnectivityState.CONNECTING) {
                        channel.getConnectivityState(true);
                    }
                    channel.watchConnectivityState(lastState, Date.now() + this._grpcConnectTimeOutMs, (error1:any) => {
                        if(!error1){
                            currentState = channel.getConnectivityState(false);
                            this._logger.info(`${this.constructor.name} channel state changed - last state: ${ConnectivityState[lastState]} -> new state: ${ConnectivityState[currentState]}`);
                            lastState = currentState;
                        }
                        setImmediate(updateLoop);
                    });
                };

                // start the update loop
                updateLoop();

                this._logger.info(`${this.constructor.name} initialized 🚀 - channel: ${channelzRf.name}`);
                return resolve();
            });
        });
	}

	async destroy():Promise<void>{
        if (!this._grpcLedgerClient) return;

        const channel = this._grpcLedgerClient.getChannel();
        if (channel) channel.close();
    }

	setToken(accessToken: string): void {
		this._loginHelper.setToken(accessToken);
	}

	setUserCredentials(client_id: string, username: string, password: string): void {
		this._loginHelper.setUserCredentials(client_id, username, password);
	}

	setAppCredentials(client_id: string, client_secret: string): void {
		this._loginHelper.setAppCredentials(client_id, client_secret);
	}

    private _getDeadline(): grpc.Deadline{
        return Date.now() + this._grpcConnectTimeOutMs;
    }

	async createAccounts(createReqs: ILedgerAdapterCreateAccountRequestItem[]): Promise<ILedgerAdapterCreateAccountResponseItem[]> {
        await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
            const request: GrpcControlPlane_CreateAccountsRequestList = {
                requests: createReqs.map(item => {
                    return {
                        requestedId: item.requestedId,
                        ownerId: item.ownerId,
                        currencyCode: item.currencyCode,
                        type: item.accountType
                    };
                })
            };

            this._grpcLedgerClient.waitForReady(this._getDeadline(), (error?:Error) => {
                if (error)
                    return reject(error);

                this._grpcLedgerClient.CreateAccounts(
                    request, this._callMetadata,
                    (err:grpc.ServiceError|null, callResp?:GrpcControlPlane_CreateAccountsResponseList__Output) => {
                    if (err){
                        this._logger.error(err);
                        throw err;
                    }

                    if (!callResp?.responses) {
                        return Promise.resolve([]);
                    }

                    return resolve(callResp.responses as ILedgerAdapterCreateAccountResponseItem[]);
                });
            });
        });
	}

/*
	async  getAccountsByIds(ledgerAccountIds: ILedgerAdapterGetAccountRequestItem[]): Promise<ILedgerAdapterGetAccountResponseItem[]>{
        return new Promise((resolve, reject) => {
            const ids: GrpcBuiltinLedger_Id[] = ledgerAccountIds.map((ledgerAccountId) => {
                return {id: ledgerAccountId.id,};
            });

            this._grpcLedgerClient.waitForReady(this._getDeadline(), (error?:Error) => {
                if (error)
                    return reject(error);

                this._grpcLedgerClient.GetAccountsByIds({ids: ids}, (err:grpc.ServiceError|null, response?:GrpcBuiltinLedger_AccountList__Output) => {
                    if (err){
                        this._logger.error(err);
                        return reject(err);
                    }

                    if (!response?.accounts) {
                        return Promise.resolve([]);
                    }

                    const ledgerAdapterAccounts: ILedgerAdapterGetAccountResponseItem[]
                        = response.accounts.map((ledgerAccount) => {
                            return {
                                id: ledgerAccount.id ?? null,
                                state: ledgerAccount.state as AnbAccountState,
                                type: ledgerAccount.type as AnbAccountType,
                                currencyCode: ledgerAccount.currencyCode!,
                                currencyDecimals: null,
                                postedDebitBalance: ledgerAccount.postedDebitBalance!,
                                pendingDebitBalance: ledgerAccount.pendingDebitBalance!,
                                postedCreditBalance: ledgerAccount.postedCreditBalance!,
                                pendingCreditBalance: ledgerAccount.pendingCreditBalance!,
                                timestampLastJournalEntry: ledgerAccount.timestampLastJournalEntry ?? null
                            };
                        });

                    return resolve(ledgerAdapterAccounts);
                });
            });
        });
	}
*/

	async deleteAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
		throw new Error("not implemented");
	}

	async deactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
        throw new Error("not implemented");
	}

	async reactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
        throw new Error("not implemented");
	}

    private async _updateCallMetadata(): Promise<void> {
        // this can throw and UnauthorizedError, let it
        const token = await this._loginHelper.getToken();
        //this._callMetadata.remove("TOKEN");
        this._callMetadata.set("TOKEN", token.accessToken);
        return Promise.resolve();
    }

}
