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

import {
	UnableToCreateAccountsError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "./errors";
import {GrpcBuiltinLedgerClient} from "./types/GrpcBuiltinLedger";
import {ProtoGrpcType} from "./types/builtin_ledger";
import {GrpcAccount__Output} from "./types/GrpcAccount";
import {GrpcId, GrpcId__Output} from "./types/GrpcId";
import {GrpcAccountArray} from "./types/GrpcAccountArray";
import {GrpcJournalEntry__Output} from "./types/GrpcJournalEntry";
import {GrpcJournalEntryArray} from "./types/GrpcJournalEntryArray";
import {join} from "path";

export class BuiltinLedgerGrpcClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly TIMEOUT_MS: number;
	// Other properties.
	private static readonly PROTO_FILE_RELATIVE_PATH: string = "./builtin_ledger.proto";
	private static readonly LOAD_PROTO_OPTIONS: Options = {
		longs: Number
	};
	private readonly client: GrpcBuiltinLedgerClient;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		timeoutMs: number
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.TIMEOUT_MS = timeoutMs;

		const packageDefinition: PackageDefinition = loadSync(
			BuiltinLedgerGrpcClient.PROTO_FILE_RELATIVE_PATH,
			BuiltinLedgerGrpcClient.LOAD_PROTO_OPTIONS
		);
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		this.client = new (grpcObject as unknown as ProtoGrpcType).GrpcBuiltinLedger(
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

	async createAccounts(grpcAccountArray: GrpcAccountArray): Promise<string[]> {
		return new Promise((resolve, reject) => {
			this.client.createAccounts(
				grpcAccountArray,
				(error, grpcIdArrayOutput) => {
					if (error || !grpcIdArrayOutput) {
						reject(new UnableToCreateAccountsError(error?.details)); // TODO: should there be a message when error is null?
						return;
					}

					const grpcIdsOutput: GrpcId__Output[] = grpcIdArrayOutput.grpcIdArray || []; // TODO: assume that there's no error?

					const accountIds: string[] = [];
					for (const grpcIdOutput of grpcIdsOutput) {
						if (!grpcIdOutput.grpcId) {
							reject(new UnableToCreateAccountsError()); // TODO: should there be a message?
							return;
						}
						accountIds.push(grpcIdOutput.grpcId);
					}
					resolve(accountIds);
				}
			);
		});
	}

	async createJournalEntries(grpcJournalEntryArray: GrpcJournalEntryArray): Promise<string[]> {
		return new Promise((resolve, reject) => {
			this.client.createJournalEntries(
				grpcJournalEntryArray,
				(error, grpcIdArrayOutput) => {
					if (error || !grpcIdArrayOutput) {
						reject(new UnableToCreateJournalEntriesError(error?.details)); // TODO: should there be a message when error is null?
						return;
					}

					// TODO: implement based on createAccounts().
				}
			);
		});
	}

	async getAccountsByIds(accountIds: string[]): Promise<GrpcAccount__Output[]> {
		return new Promise((resolve, reject) => {
			const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
				return {grpcId: accountId}; // TODO: return object directly?
			});
			// const grpcAccountIdArray: GrpcIdArray = {grpcIdArray: grpcAccountIds};

			this.client.getAccountsByIds(
				{grpcIdArray: grpcAccountIds}, // TODO: pass object directly?
				(error, grpcAccountArrayOutput) => {
					if (error || !grpcAccountArrayOutput) {
						reject(new UnableToGetAccountsError(error?.details)); // TODO: should there be a message when error is null?
						return;
					}

					const grpcAccountsOutput: GrpcAccount__Output[] = grpcAccountArrayOutput.grpcAccountArray || []; // TODO: assume that there's no error?
					resolve(grpcAccountsOutput);
				}
			);
		});
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<GrpcJournalEntry__Output[]> {
		return new Promise((resolve, reject) => {
			// const grpcAccountId: GrpcId = {grpcId: accountId};

			this.client.getJournalEntriesByAccountId(
				{grpcId: accountId}, // TODO: pass object directly?
				(error, grpcJournalEntryArrayOutput) => {
					if (error || !grpcJournalEntryArrayOutput) {
						reject(new UnableToGetJournalEntriesError(error?.details)); // TODO: should there be a message when error is null?
						return;
					}

					const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] =
						grpcJournalEntryArrayOutput.grpcJournalEntryArray || []; // TODO: assume that there's no error?
					resolve(grpcJournalEntriesOutput);
				}
			);
		});
	}
}
