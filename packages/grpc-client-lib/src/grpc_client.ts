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

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesAccount,
	AccountsAndBalancesAccountState,
	AccountsAndBalancesAccountType,
	AcountsAndBalancesJournalEntry
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {

} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {join} from "path";
import {
	GrpcAccount,
	GrpcAccount__Output,
	GrpcAccountsAndBalancesClient,
	GrpcId,
	GrpcId__Output,
	GrpcJournalEntry,
	GrpcJournalEntry__Output,
	ProtoGrpcType
} from "./types";
import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import {UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";

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
	private readonly _loginHelper:LoginHelper;

	constructor(
		url: string,
		loginHelper: LoginHelper,
		logger: ILogger
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._loginHelper = loginHelper;

		const protoFileAbsolutePath: string = join(__dirname, PROTO_FILE_NAME);
		const packageDefinition: protoLoader.PackageDefinition = protoLoader.loadSync(
			protoFileAbsolutePath,
			LOAD_PROTO_OPTIONS
		);
		const grpcObject: grpc.GrpcObject = grpc.loadPackageDefinition(packageDefinition);

		this._callMetadata = new grpc.Metadata();

		this._client = new (grpcObject as unknown as ProtoGrpcType).GrpcAccountsAndBalances(
			url,
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
			const deadline: grpc.Deadline = Date.now() + TIMEOUT_MS;

			this._client.waitForReady(
				deadline,
				(error) => {
					if (error !== undefined) {
						reject(error);
						return;
					}

					this._logger.info("gRPC client initialized 🚀");
					resolve();
				}
			);
		});
	}

	async destroy(): Promise<void> {
		this._client.close();
		this._logger.info("gRPC client destroyed 🏁");
	}

	async createAccounts(accounts: AccountsAndBalancesAccount[]): Promise<string[]> {
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
	}

	async createJournalEntries(journalEntries: AcountsAndBalancesJournalEntry[]): Promise<string[]> {
		const grpcJournalEntries: GrpcJournalEntry[] = journalEntries.map((journalEntry) => {
			const grpcJournalEntry: GrpcJournalEntry = {
				id: journalEntry.id ?? undefined, 
				ownerId: journalEntry.ownerId ?? undefined, 
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
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

	async getJournalEntriesByAccountId(accountId: string): Promise<AcountsAndBalancesJournalEntry[]> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.getJournalEntriesByAccountId(
				{grpcId: accountId},
				this._callMetadata,
				(error, resp) => {
					if (error || !resp) return reject(error);

					const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] = resp.grpcJournalEntryArray || [];
					// resolve(grpcJournalEntriesOutput);

					const journalEntries: AcountsAndBalancesJournalEntry[] =
						grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
						if (
							!grpcJournalEntryOutput.currencyCode
							|| !grpcJournalEntryOutput.amount
							|| !grpcJournalEntryOutput.debitedAccountId
							|| !grpcJournalEntryOutput.creditedAccountId
						) {
							throw new Error(); // TODO: create custom error.
						}

						const journalEntry: AcountsAndBalancesJournalEntry = {
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

	private _grpcAccountsOutputToAccounts(grpcAccountsOutput: GrpcAccount__Output[]): AccountsAndBalancesAccount[] {
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
