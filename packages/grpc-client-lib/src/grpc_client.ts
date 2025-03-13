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

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use strict";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    AccountsAndBalancesAccount,
    AccountsAndBalancesAccountState,
    AccountsAndBalancesAccountType,
    AccountsAndBalancesJournalEntry,
    AccountsBalancesHighLevelRequestTypes,
    IAccountsBalancesHighLevelRequest,
    IAccountsBalancesHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {

} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {join} from "path";
import {
	GrpcAccount__Output,
	GrpcAccountsAndBalancesClient,
	GrpcId,
	GrpcCreateAccountArray,
	GrpcCreateJournalEntryArray,
	GrpcJournalEntry__Output,
	ProtoGrpcType,
	GrpcIdArray

} from "./types";

import {ILoginHelper} from "@mojaloop/security-bc-public-types-lib";
import {GrpcHighLevelRequestArray} from "./types/proto-gen/GrpcHighLevelRequestArray";
import {ConnectivityState} from "@grpc/grpc-js/build/src/connectivity-state";

const PROTO_FILE_NAME = "accounts_and_balances.proto";
const LOAD_PROTO_OPTIONS: protoLoader.Options = {
	longs: Number
};
const TIMEOUT_MS = 5_000;

export class AccountsAndBalancesGrpcClient {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _callMetadata: grpc.Metadata;
	private readonly _client: GrpcAccountsAndBalancesClient;
	private readonly _loginHelper:ILoginHelper;
	private readonly _url:string;

	constructor(
		url: string,
		loginHelper: ILoginHelper,
		logger: ILogger
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._loginHelper = loginHelper;
		this._url = url;

		const protoFileAbsolutePath: string = join(__dirname, PROTO_FILE_NAME);
		const packageDefinition: protoLoader.PackageDefinition = protoLoader.loadSync(
			protoFileAbsolutePath,
			LOAD_PROTO_OPTIONS
		);
		const grpcObject: grpc.GrpcObject = grpc.loadPackageDefinition(packageDefinition);

		this._callMetadata = new grpc.Metadata();

		this._client = new (grpcObject as unknown as ProtoGrpcType).GrpcAccountsAndBalances(
			this._url,
			grpc.credentials.createInsecure()
		);
	}

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
			this._logger.info(`Connecting AccountsAndBalancesGrpcClient to url: ${this._url}`);

            const deadline: grpc.Deadline = Date.now() + TIMEOUT_MS;
            this._client.waitForReady(deadline, (error) => {
                if (error) return reject(error);

                const channelzRf = this._client.getChannel().getChannelzRef();
                this._logger.info(`CoA gRPC client initialized 🚀 - channel: ${channelzRf.name}`);

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
                            this._logger.info(`Accounts and CoA gRPC client channel state changed - last state: ${ConnectivityState[lastState]} -> new state: ${ConnectivityState[currentState]}`);
                            lastState = currentState;
                        }
                        setImmediate(updateLoop);
                    });
                };

                // start the update loop
                updateLoop();

                resolve();
            });
		});
	}

	async destroy(): Promise<void> {
		this._client.close();
		this._logger.info("gRPC client destroyed 🏁");
	}

	async createAccounts(accountCreates: GrpcCreateAccountArray): Promise<GrpcIdArray> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createAccounts(accountCreates, this._callMetadata, (error, idsResponse) => {
					if (error || !idsResponse) return reject(error);
					resolve(idsResponse);
				}
			);
		});
	}

	/*	async createAccounts(accounts: AccountsAndBalancesAccount[]): Promise<string[]> {
			const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
				const grpcAccount: GrpcAccount = {
					id: account.id ?? undefined,
					ownerId: account.ownerId,
					state: account.state,
					type: account.type,
					currencyCode: account.currencyCode,
					postedDebitBalance: account.postedDebitBalance ?? undefined,
					pendingDebitBalance: account.pendingDebitBalance ?? undefined,
					postedCreditBalance: account.postedCreditBalance ?? undefined,
					pendingCreditBalance: account.pendingCreditBalance ?? undefined,
					balance: account.balance ?? undefined,
					timestampLastJournalEntry: account.timestampLastJournalEntry ?? undefined
				};
				return grpcAccount;
			});

			await this._updateCallMetadata();

			return new Promise((resolve, reject) => {
				this._client.createAccounts(
					{grpcAccountArray: grpcAccounts},
					this._callMetadata,
					(error, resp) => {
						if (error || !resp) return reject(error);

						const grpcIdsOutput: GrpcId__Output[] = resp.grpcIdArray || [];

						const accountIds: string[] = [];
						for (const grpcIdOutput of grpcIdsOutput) {
							if (!grpcIdOutput.grpcId) {
								reject(new Error()); // todo cleanup
								return;
							}
							accountIds.push(grpcIdOutput.grpcId);
						}
						resolve(accountIds);
					}
				);
			});
		}*/

	async createJournalEntries(entryCreates: GrpcCreateJournalEntryArray): Promise<GrpcIdArray> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createJournalEntries(entryCreates, this._callMetadata, (error, idsResponse) => {
					if (error || !idsResponse) return reject(error);
					resolve(idsResponse);
				}
			);
		});
	}


/*
	async createJournalEntries(journalEntries: AccountsAndBalancesJournalEntry[]): Promise<string[]> {
		const grpcJournalEntries: GrpcJournalEntry[] = journalEntries.map((journalEntry) => {
			const grpcJournalEntry: GrpcJournalEntry = {
				id: journalEntry.id ?? undefined,
				ownerId: journalEntry.ownerId ?? undefined,
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
				pending: journalEntry.pending,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp ?? undefined
			};
			return grpcJournalEntry;
		});

		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createJournalEntries(
				{grpcJournalEntryArray: grpcJournalEntries},this._callMetadata, (error, resp) => {
					if (error || !resp) return reject(error);

					const grpcIdsOutput: GrpcId__Output[] = resp.grpcIdArray || [];

					const journalEntryIds: string[] = [];
					for (const grpcIdOutput of grpcIdsOutput) {
						if (!grpcIdOutput.grpcId) {
							reject(new Error()); // todo cleanup
							return;
						}
						journalEntryIds.push(grpcIdOutput.grpcId);
					}
					resolve(journalEntryIds);
				}
			);
		});
	}
*/

	async getAccountsByIds(accountIds: string[]): Promise<AccountsAndBalancesAccount[]> {
		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});

		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.getAccountsByIds(
				{grpcIdArray: grpcAccountIds}, this._callMetadata, (error, resp) => {
					if (error || !resp) return reject(error);

					const accounts: AccountsAndBalancesAccount[] = this._grpcAccountsOutputToAccounts(resp.grpcAccountArray || []);
					resolve(accounts);
				}
			);
		});
	}

	async getAccountsByOwnerId(ownerId: string): Promise<AccountsAndBalancesAccount[]> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.getAccountsByOwnerId({grpcId: ownerId}, this._callMetadata, (error, resp) => {
				if (error || !resp) return reject(error);

				const accounts: AccountsAndBalancesAccount[] = this._grpcAccountsOutputToAccounts(resp.grpcAccountArray || []);
				resolve(accounts);
			});
		});
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<AccountsAndBalancesJournalEntry[]> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.getJournalEntriesByAccountId(
				{grpcId: accountId},
				this._callMetadata,
				(error, resp) => {
					if (error || !resp) return reject(error);

					const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] = resp.grpcJournalEntryArray || [];
					// resolve(grpcJournalEntriesOutput);

					const journalEntries: AccountsAndBalancesJournalEntry[] =
						grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
						if (
							!grpcJournalEntryOutput.currencyCode
							|| !grpcJournalEntryOutput.amount
							|| !grpcJournalEntryOutput.debitedAccountId
							|| !grpcJournalEntryOutput.creditedAccountId
						) {
							throw new Error(); // TODO: create custom error.
						}

						const journalEntry: AccountsAndBalancesJournalEntry = {
							id: grpcJournalEntryOutput.id ?? null,
							ownerId: grpcJournalEntryOutput.ownerId ?? null,
							currencyCode: grpcJournalEntryOutput.currencyCode,
							amount: grpcJournalEntryOutput.amount,
							pending: grpcJournalEntryOutput.pending!,
							debitedAccountId: grpcJournalEntryOutput.debitedAccountId,
							creditedAccountId: grpcJournalEntryOutput.creditedAccountId,
							timestamp: grpcJournalEntryOutput.timestamp ?? null
						};
						return journalEntry;
					});
					resolve(journalEntries);
				}
			);
		});
	}

	async deleteAccountsByIds(accountIds: string[]): Promise<void> {
		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});

		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.deleteAccountsByIds({grpcIdArray: grpcAccountIds}, this._callMetadata, (error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async deactivateAccountsByIds(accountIds: string[]): Promise<void> {
		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});

		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.deactivateAccountsByIds({grpcIdArray: grpcAccountIds},this._callMetadata, (error) => {
					if (error) return reject(error);
					resolve();
			});
		});
	}

	async activateAccountsByIds(accountIds: string[]): Promise<void> {
		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});

		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.activateAccountsByIds({grpcIdArray: grpcAccountIds}, this._callMetadata,(error) => {
					if (error) return reject(error);
					resolve();
			});
		});
	}

    async processHighLevelBatch(requests:IAccountsBalancesHighLevelRequest[]): Promise<IAccountsBalancesHighLevelResponse[]>{
        const grpcRequests:GrpcHighLevelRequestArray = {
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
                    )) {
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
	// High level

	async checkLiquidAndReserve(
		payerPositionAccountId: string, payerLiquidityAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, payerNetDebitCap: string, transferId: string
	): Promise<void>{

		const req: GrpcCheckLiquidAndReserveRequest = {
			payerPositionAccountId: payerPositionAccountId,
			payerLiquidityAccountId: payerLiquidityAccountId,
			hubJokeAccountId: hubJokeAccountId,
			currencyCode: currencyCode,
			payerNetDebitCap:payerNetDebitCap,
			transferAmount: transferAmount,
			transferId: transferId
		};

        await this._updateCallMetadata();
		return new Promise((resolve, reject) => {
			this._client.checkLiquidAndReserve(req, this._callMetadata, (error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async cancelReservationAndCommit(
		payerPositionAccountId: string, payeePositionAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, transferId: string
	): Promise<void> {
		const req: GrpcCancelReservationAndCommitRequest = {
			payerPositionAccountId: payerPositionAccountId,
			payeePositionAccountId: payeePositionAccountId,
			hubJokeAccountId: hubJokeAccountId,
			currencyCode: currencyCode,
			transferAmount: transferAmount,
			transferId: transferId
		};

        await this._updateCallMetadata();
		return new Promise((resolve, reject) => {
			this._client.cancelReservationAndCommit(req, this._callMetadata, (error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async cancelReservation(
		payerPositionAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, transferId: string
	): Promise<void> {
		const req: GrpcCancelReservationRequest = {
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

*/	private _grpcAccountsOutputToAccounts(grpcAccountsOutput: GrpcAccount__Output[]): AccountsAndBalancesAccount[] {
		const accounts: AccountsAndBalancesAccount[] = grpcAccountsOutput.map((grpcAccountOutput) => {
			if (
				!grpcAccountOutput.ownerId
				|| !grpcAccountOutput.state
				|| !grpcAccountOutput.type
				|| !grpcAccountOutput.currencyCode
			) {
				throw new Error();
			}

			const account: AccountsAndBalancesAccount = {
				id: grpcAccountOutput.id ?? null,
				ownerId: grpcAccountOutput.ownerId,
				state: grpcAccountOutput.state as AccountsAndBalancesAccountState,
				type: grpcAccountOutput.type as AccountsAndBalancesAccountType,
				currencyCode: grpcAccountOutput.currencyCode,
				postedDebitBalance: grpcAccountOutput.postedDebitBalance ?? null,
				pendingDebitBalance: grpcAccountOutput.pendingDebitBalance ?? null,
				postedCreditBalance: grpcAccountOutput.postedCreditBalance ?? null,
				pendingCreditBalance: grpcAccountOutput.pendingCreditBalance ?? null,
				balance: grpcAccountOutput.balance ?? null,
				timestampLastJournalEntry: grpcAccountOutput.timestampLastJournalEntry ?? null
			};
			return account;
		});
		return accounts;
	}
}
