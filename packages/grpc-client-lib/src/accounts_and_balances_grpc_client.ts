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
import {PackageDefinition} from "@grpc/proto-loader";
import {credentials, GrpcObject, loadPackageDefinition} from "@grpc/grpc-js";
import {
	IAccount,
	IJournalEntry,
	GrpcAccount,
	GrpcId,
	GrpcJournalEntryArray,
	ProtoGrpcType,
	AccountsAndBalancesGrpcServiceClient, grpcAccountToIAccount, grpcJournalEntryToIJournalEntry,
	loadProto
} from "@mojaloop/accounts-and-balances-bc-common-lib";

export class AccountsAndBalancesGrpcClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly grpcClient: AccountsAndBalancesGrpcServiceClient;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number
	) {
		this.logger = logger;

		const packageDefinition: PackageDefinition = loadProto();
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		this.grpcClient = new (grpcObject as unknown as ProtoGrpcType).AccountsAndBalancesGrpcService(
			`${host}:${portNo}`,
			credentials.createInsecure()
		);
	}

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.grpcClient.waitForReady(
				Date.now() + 50000, // TODO: put this value in a constant.
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
		this.logger.info("gRPC client destroyed 🏁");
	}

	// TODO: verify types.
	async createAccount(grpcAccount: GrpcAccount): Promise<string> {
		return new Promise((resolve, reject) => {
			this.grpcClient.createAccount(
				grpcAccount,
				(error, grpcId) => {
					if (error) {
						reject(error);
						return; // TODO: return?
					}
					const accountId: string = grpcId!.grpcId; // TODO: !.
					resolve(accountId);
				}
			);
		});
	}

	// TODO: verify types.
	async createJournalEntries(grpcJournalEntryArray: GrpcJournalEntryArray): Promise<string[]> {
		return new Promise((resolve, reject) => {
			this.grpcClient.createJournalEntries(
				grpcJournalEntryArray,
				(error, grpcIdArray) => {
					if (error) {
						reject(error);
						return; // TODO: return?
					}
					const idsJournalEntries = grpcIdArray!.grpcIdArray.map(grpcId => { // TODO: !.
						return grpcId.grpcId;
					});
					resolve(idsJournalEntries);
				}
			);
		});
	}

	// TODO: verify types.
	async getAccountById(accountGrpcId: GrpcId): Promise<IAccount | null> {
		return new Promise((resolve, reject) => {
			this.grpcClient.getAccountById(
				accountGrpcId,
				(error, grpcAccount) => {
					if (error) {
						reject(error);
						return; // TODO: return?
					}
					let iAccount: IAccount | null;
					if (grpcAccount!.id === "") { // TODO: !.
						iAccount = null;
					} else {
						iAccount = grpcAccountToIAccount(grpcAccount!); // TODO: !.
					}
					resolve(iAccount);
				}
			);
		});
	}

	// TODO: verify types.
	async getAccountsByExternalId(externalGrpcId: GrpcId): Promise<IAccount[]> {
		return new Promise((resolve, reject) => {
			this.grpcClient.getAccountsByExternalId(
				externalGrpcId,
				(error, grpcAccountArray) => {
					if (error) {
						reject(error);
						return; // TODO: return?
					}
					const iAccounts: IAccount[] = [];
					for (const grpcAccount of grpcAccountArray!.grpcAccountArray) { // TODO: !.
						iAccounts.push(grpcAccountToIAccount(grpcAccount));
					}
					resolve(iAccounts);
				}
			);
		});
	}

	// TODO: verify types.
	async getJournalEntriesByAccountId(accountGrpcId: GrpcId): Promise<IJournalEntry[]> {
		return new Promise((resolve, reject) => {
			this.grpcClient.getJournalEntriesByAccountId(
				accountGrpcId,
				(error, grpcJournalEntryArray) => {
					if (error) {
						reject(error);
						return; // TODO: return?
					}
					const iJournalEntries: IJournalEntry[] = [];
					for (const grpcJournalEntry of grpcJournalEntryArray!.grpcJournalEntryArray) { // TODO: !.
						iJournalEntries.push(grpcJournalEntryToIJournalEntry(grpcJournalEntry));
					}
					resolve(iJournalEntries);
				}
			);
		});
	}
}
