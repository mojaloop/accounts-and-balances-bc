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
import {loadSync, PackageDefinition} from "@grpc/proto-loader";
import {credentials, GrpcObject, loadPackageDefinition, ServiceError} from "@grpc/grpc-js";
import {ProtoGrpcType} from "../../src/proto/gen/accounts_and_balances";
import {AccountsAndBalancesGrpcServiceClient} from "../../src/proto/gen/AccountsAndBalancesGrpcService";
import {GrpcAccount, GrpcAccount__Output} from "../../src/proto/gen/GrpcAccount";
import {GrpcId__Output} from "../../src/proto/gen/GrpcId";
import {GrpcIdArray__Output} from "../../src/proto/gen/GrpcIdArray";
import {GrpcAccountArray__Output} from "../../src/proto/gen/GrpcAccountArray";
import {GrpcJournalEntryArray, GrpcJournalEntryArray__Output} from "../../src/proto/gen/GrpcJournalEntryArray";
import {IAccount, IJournalEntry} from "@mojaloop/accounts-and-balances-bc-domain-lib";

export class AuxiliaryAccountsAndBalancesGrpcClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly grpcClient: AccountsAndBalancesGrpcServiceClient;

	constructor(
		logger: ILogger,
		portFilePath: string,
		host: string,
		portNo: number,
	) {
		this.logger = logger;

		const packageDefinition: PackageDefinition = loadSync(
			portFilePath,
			{
				longs: String,
				enums: String,
				defaults: true
			}
		); // TODO: check other params.
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		this.grpcClient = new (grpcObject as unknown as ProtoGrpcType).AccountsAndBalancesGrpcService(
			`${host}:${portNo}`,
			credentials.createInsecure()
		);
	}

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.grpcClient.waitForReady(
				Date.now() + 50000,
				(error) => {
					if (error) {
						reject(error);
					}
					this.logger.info("gRPC client initialized 🚀");
					resolve();
				}
			);
		})
	}

	async destroy(): Promise<void> {
		this.grpcClient.close();
		this.logger.info("gRPC client destroyed 🚀");
	}

	async createAccount(account: any): Promise<string> {
		return new Promise((resolve, reject) => {
			this.grpcClient.createAccount(
				account,
				(error, accountId?: GrpcId__Output) => {
					if (error) {
						reject(error);
					}
					resolve(accountId?.value as string); // TODO: correct.
				}
			);
		});
	}

	async createJournalEntries(journalEntries: any[]): Promise<string[]> {
		return new Promise((resolve, reject) => {
			this.grpcClient.createJournalEntries(
				{value: journalEntries},
				(e, idsJournalEntries?: GrpcIdArray__Output) => {
					if (e) {
						reject(e);
					}
					resolve(idsJournalEntries as unknown as string[]);
				}
			);
		});
	}

	async getAccountById(accountId: string): Promise<IAccount | null> {
		return new Promise((resolve, reject) => {
			this.grpcClient.getAccountById(
				{value: accountId},
				(e: ServiceError | null, account?: GrpcAccount__Output) => {
					if (e) {
						reject(e);
					}
					// TODO: do this?
					if (account?.id === "") {
						resolve(null);
					}
					resolve(account as unknown as IAccount);
				}
			);
		});
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccount[]> {
		return new Promise((resolve, reject) => {
			this.grpcClient.getAccountsByExternalId(
				{value: externalId},
				(e: ServiceError | null, accounts?: GrpcAccountArray__Output) => {
					if (e) {
						reject(e);
					}
					resolve(accounts as unknown as IAccount[]);
				}
			);
		});
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntry[]> {
		return new Promise((resolve, reject) => {
			this.grpcClient.getJournalEntriesByAccountId(
				{value: accountId},
				(e: ServiceError | null, journalEntries?: GrpcJournalEntryArray__Output) => {
					if (e) {
						reject(e);
					}
					resolve(journalEntries as unknown as IJournalEntry[]);
				}
			);
		});
	}
}
