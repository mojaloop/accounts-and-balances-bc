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
import {loadSync, Options, PackageDefinition} from "@grpc/proto-loader";
import {credentials, GrpcObject, loadPackageDefinition, Deadline} from "@grpc/grpc-js";
import {
	UnableToActivateAccountsError,
	UnableToCreateAccountsError,
	UnableToCreateJournalEntriesError, UnableToDeactivateAccountsError, UnableToDeleteAccountsError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "./errors";
import {GrpcBuiltinLedgerClient} from "./types/GrpcBuiltinLedger";
import {ProtoGrpcType} from "./types/builtin_ledger";
import {
	BuiltinLedgerGrpcAccountArray,
	BuiltinLedgerGrpcAccountArray__Output
} from "./types/BuiltinLedgerGrpcAccountArray";
import {BuiltinLedgerGrpcId} from "./types/BuiltinLedgerGrpcId";
import {BuiltinLedgerGrpcIdArray, BuiltinLedgerGrpcIdArray__Output} from "./types/BuiltinLedgerGrpcIdArray";
import {
	BuiltinLedgerGrpcJournalEntryArray,
	BuiltinLedgerGrpcJournalEntryArray__Output
} from "./types/BuiltinLedgerGrpcJournalEntryArray";
import {join} from "path";

export class BuiltinLedgerGrpcClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private static readonly PROTO_FILE_NAME: string = "builtin_ledger.proto";
	private static readonly LOAD_PROTO_OPTIONS: Options = {
		longs: Number
	};
	private static readonly TIMEOUT_MS: number = 5_000;
	private readonly client: GrpcBuiltinLedgerClient;

	constructor(
		logger: ILogger,
		url: string
	) {
		this.logger = logger.createChild(this.constructor.name);

		const protoFileAbsolutePath: string = join(__dirname, BuiltinLedgerGrpcClient.PROTO_FILE_NAME);
		const packageDefinition: PackageDefinition = loadSync(
			protoFileAbsolutePath,
			BuiltinLedgerGrpcClient.LOAD_PROTO_OPTIONS
		);
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		this.client = new (grpcObject as unknown as ProtoGrpcType).GrpcBuiltinLedger(
			url,
			credentials.createInsecure()
		);
	}

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const deadline: Deadline = Date.now() + BuiltinLedgerGrpcClient.TIMEOUT_MS;

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

	async createAccounts(
		builtinLedgerGrpcAccountArray: BuiltinLedgerGrpcAccountArray
	): Promise<BuiltinLedgerGrpcIdArray__Output> {
		return new Promise((resolve, reject) => {
			this.client.createAccounts(
				builtinLedgerGrpcAccountArray,
				(error, builtinLedgerGrpcIdArrayOutput) => {
					if (error || !builtinLedgerGrpcIdArrayOutput) {
						reject(new UnableToCreateAccountsError(error?.details));
						return;
					}

					/*const builtinLedgerGrpcIdsOutput: BuiltinLedgerGrpcId__Output[]
						= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray || [];

					const accountIds: string[] = [];
					for (const builtinLedgerGrpcIdOutput of builtinLedgerGrpcIdsOutput) {
						if (!builtinLedgerGrpcIdOutput.builtinLedgerGrpcId) {
							reject(new UnableToCreateAccountsError());
							return;
						}
						accountIds.push(builtinLedgerGrpcIdOutput.builtinLedgerGrpcId);
					}
					resolve(accountIds);*/

					resolve(builtinLedgerGrpcIdArrayOutput);
				}
			);
		});
	}

	async createJournalEntries(
		builtinLedgerGrpcJournalEntryArray: BuiltinLedgerGrpcJournalEntryArray
	): Promise<BuiltinLedgerGrpcIdArray__Output> {
		return new Promise((resolve, reject) => {
			this.client.createJournalEntries(
				builtinLedgerGrpcJournalEntryArray,
				(error, builtinLedgerGrpcIdArrayOutput) => {
					if (error || !builtinLedgerGrpcIdArrayOutput) {
						reject(new UnableToCreateJournalEntriesError(error?.details));
						return;
					}

					/*const builtinLedgerGrpcIdsOutput: BuiltinLedgerGrpcId__Output[]
						= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray || [];

					const journalEntryIds: string[] = [];
					for (const builtinLedgerGrpcIdOutput of builtinLedgerGrpcIdsOutput) {
						if (!builtinLedgerGrpcIdOutput.builtinLedgerGrpcId) {
							reject(new UnableToCreateJournalEntriesError());
							return;
						}
						journalEntryIds.push(builtinLedgerGrpcIdOutput.builtinLedgerGrpcId);
					}
					resolve(journalEntryIds);*/

					resolve(builtinLedgerGrpcIdArrayOutput);
				}
			);
		});
	}

	async getAccountsByIds(
		builtinLedgerGrpcAccountIdArray: BuiltinLedgerGrpcIdArray
	): Promise<BuiltinLedgerGrpcAccountArray__Output> {
		return new Promise((resolve, reject) => {
			this.client.getAccountsByIds(
				builtinLedgerGrpcAccountIdArray,
				(error, builtinLedgerGrpcAccountArrayOutput) => {
					if (error || !builtinLedgerGrpcAccountArrayOutput) {
						reject(new UnableToGetAccountsError(error?.details));
						return;
					}

					/*const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[]
						= builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray || [];
					resolve(builtinLedgerGrpcAccountsOutput);*/

					resolve(builtinLedgerGrpcAccountArrayOutput);
				}
			);
		});
	}

	async getJournalEntriesByAccountId(
		builtinLedgerGrpcAccountId: BuiltinLedgerGrpcId
	): Promise<BuiltinLedgerGrpcJournalEntryArray__Output> {
		return new Promise((resolve, reject) => {
			this.client.getJournalEntriesByAccountId(
				builtinLedgerGrpcAccountId,
				(error, builtinLedgerGrpcJournalEntryArrayOutput) => {
					if (error || !builtinLedgerGrpcJournalEntryArrayOutput) {
						reject(new UnableToGetJournalEntriesError(error?.details));
						return;
					}

					/*const builtinLedgerGrpcJournalEntriesOutput: BuiltinLedgerGrpcJournalEntry__Output[] =
						builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray || [];
					resolve(builtinLedgerGrpcJournalEntriesOutput);*/

					resolve(builtinLedgerGrpcJournalEntryArrayOutput);
				}
			);
		});
	}

	async deleteAccountsByIds(
		builtinLedgerGrpcAccountIdArray: BuiltinLedgerGrpcIdArray
	): Promise<void> {
		return new Promise((resolve, reject) => {
			this.client.deleteAccountsByIds(
				builtinLedgerGrpcAccountIdArray,
				(error) => {
					if (error) {
						reject(new UnableToDeleteAccountsError(error.details));
						return;
					}

					resolve();
				}
			);
		});
	}

	async deactivateAccountsByIds(
		builtinLedgerGrpcAccountIdArray: BuiltinLedgerGrpcIdArray
	): Promise<void> {
		return new Promise((resolve, reject) => {
			this.client.deactivateAccountsByIds(
				builtinLedgerGrpcAccountIdArray,
				(error) => {
					if (error) {
						reject(new UnableToDeactivateAccountsError(error.details));
						return;
					}

					resolve();
				}
			);
		});
	}

	async activateAccountsByIds(
		builtinLedgerGrpcAccountIdArray: BuiltinLedgerGrpcIdArray
	): Promise<void> {
		return new Promise((resolve, reject) => {
			this.client.activateAccountsByIds(
				builtinLedgerGrpcAccountIdArray,
				(error) => {
					if (error) {
						reject(new UnableToActivateAccountsError(error.details));
						return;
					}

					resolve();
				}
			);
		});
	}
}
