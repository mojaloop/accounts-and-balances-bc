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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {loadSync, Options, PackageDefinition} from "@grpc/proto-loader";
import {credentials, GrpcObject, loadPackageDefinition, Deadline} from "@grpc/grpc-js";
import {Account, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {GrpcId, GrpcId__Output} from "./types/GrpcId";
import {GrpcAccount, GrpcAccount__Output} from "./types/GrpcAccount";
import {GrpcJournalEntry, GrpcJournalEntry__Output} from "./types/GrpcJournalEntry";
import {GrpcAccountsAndBalancesClient} from "./types/GrpcAccountsAndBalances";
import {ProtoGrpcType} from "./types/accounts_and_balances";
import {
	UnableToCreateAccountsError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "./errors";

export class GrpcClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly TIMEOUT_MS: number;
	// Other properties.
	private static readonly PROTO_FILE_RELATIVE_PATH: string = "./account_and_balances.proto";
	private static readonly LOAD_PROTO_OPTIONS: Options = {
		longs: Number
	};
	private readonly client: GrpcAccountsAndBalancesClient;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		timeoutMs: number
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.TIMEOUT_MS = timeoutMs;

		const packageDefinition: PackageDefinition = loadSync(
			GrpcClient.PROTO_FILE_RELATIVE_PATH,
			GrpcClient.LOAD_PROTO_OPTIONS
		);
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		this.client = new (grpcObject as unknown as ProtoGrpcType).GrpcAccountsAndBalances(
			`${host}:${portNo}`,
			credentials.createInsecure()
		);
	}

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const deadline: Deadline = Date.now() + this.TIMEOUT_MS;

			this.client.waitForReady(
				deadline,
				(error) => {
					if (error !== undefined) {
						reject(error);
						return;
					}

					this.logger.info("gRPC client initialized 🚀");
					resolve();
				}
			);
		});
	}

	async destroy(): Promise<void> {
		this.client.close();
		this.logger.info("gRPC client destroyed 🏁");
	}

	async createAccounts(accounts: Account[]): Promise<string[]> {
		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			const grpcAccount: GrpcAccount = {
				id: account.id ?? undefined, // TODO: ?? or ||?
				ownerId: account.ownerId,
				state: account.state,
				type: account.type,
				currencyCode: account.currencyCode,
				debitBalance: account.debitBalance ?? undefined, // TODO: ?? or ||?
				creditBalance: account.creditBalance ?? undefined, // TODO: ?? or ||?
				timestampLastJournalEntry: account.timestampLastJournalEntry ?? undefined // TODO: ?? or ||?
			};
			return grpcAccount;
		});
		
		return new Promise((resolve, reject) => {
			this.client.createAccounts(
				{grpcAccountArray: grpcAccounts},
				(error, grpcIdArrayOutput) => {
					if (error || !grpcIdArrayOutput) {
						reject(new UnableToCreateAccountsError(error?.details));
						return;
					}

					const grpcIdsOutput: GrpcId__Output[]
						= grpcIdArrayOutput.grpcIdArray || [];

					const accountIds: string[] = [];
					for (const grpcIdOutput of grpcIdsOutput) {
						if (!grpcIdOutput.grpcId) {
							reject(new UnableToCreateAccountsError());
							return;
						}
						accountIds.push(grpcIdOutput.grpcId);
					}
					resolve(accountIds);
				}
			);
		});
	}

	async createJournalEntries(journalEntries: JournalEntry[]): Promise<string[]> {
		const grpcJournalEntries: GrpcJournalEntry[] = journalEntries.map((journalEntry) => {
			const grpcJournalEntry: GrpcJournalEntry = {
				id: journalEntry.id ?? undefined, // TODO: ?? or ||?
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp ?? undefined // TODO: ?? or ||?
			};
			return grpcJournalEntry;
		});
		
		return new Promise((resolve, reject) => {
			this.client.createJournalEntries(
				{grpcJournalEntryArray: grpcJournalEntries},
				(error, grpcIdArrayOutput) => {
					if (error || !grpcIdArrayOutput) {
						reject(new UnableToCreateJournalEntriesError(error?.details));
						return;
					}

					const grpcIdsOutput: GrpcId__Output[]
						= grpcIdArrayOutput.grpcIdArray || [];

					const journalEntryIds: string[] = [];
					for (const grpcIdOutput of grpcIdsOutput) {
						if (!grpcIdOutput.grpcId) {
							reject(new UnableToCreateJournalEntriesError());
							return;
						}
						journalEntryIds.push(grpcIdOutput.grpcId);
					}
					resolve(journalEntryIds);
				}
			);
		});
	}

	async getAccountsByIds(accountIds: string[]): Promise<GrpcAccount__Output[]> {
		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});

		return new Promise((resolve, reject) => {
			this.client.getAccountsByIds(
				{grpcIdArray: grpcAccountIds},
				(error, grpcAccountArrayOutput) => {
					if (error || !grpcAccountArrayOutput) {
						reject(new UnableToGetAccountsError(error?.details));
						return;
					}

					const grpcAccountsOutput: GrpcAccount__Output[] = grpcAccountArrayOutput.grpcAccountArray || [];
					resolve(grpcAccountsOutput);
				}
			);
		});
	}

	async getAccountsByOwnerId(ownerId: string): Promise<GrpcAccount__Output[]> {
		return new Promise((resolve, reject) => {
			this.client.getAccountsByOwnerId(
				{grpcId: ownerId},
				(error, grpcAccountArrayOutput) => {
					if (error || !grpcAccountArrayOutput) {
						reject(new UnableToGetAccountsError(error?.details));
						return;
					}

					const grpcAccountsOutput: GrpcAccount__Output[] = grpcAccountArrayOutput.grpcAccountArray || [];
					resolve(grpcAccountsOutput);
				}
			);
		});
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<GrpcJournalEntry__Output[]> {
		return new Promise((resolve, reject) => {
			this.client.getJournalEntriesByAccountId(
				{grpcId: accountId},
				(error, grpcJournalEntryArrayOutput) => {
					if (error || !grpcJournalEntryArrayOutput) {
						reject(new UnableToGetJournalEntriesError(error?.details));
						return;
					}

					const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] =
						grpcJournalEntryArrayOutput.grpcJournalEntryArray || [];
					resolve(grpcJournalEntriesOutput);
				}
			);
		});
	}
}
