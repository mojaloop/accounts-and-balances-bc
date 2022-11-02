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
import {credentials, GrpcObject, loadPackageDefinition, Deadline} from "@grpc/grpc-js";
import {
	ProtoGrpcType,
	AccountsAndBalancesGrpcServiceClient,
	loadProto,
	accountDtoToGrpcAccount,
	GrpcAccount,
	GrpcId,
	GrpcJournalEntryArray,
	journalEntryDtoToGrpcJournalEntry,
	GrpcJournalEntry,
	grpcAccountOutputToAccountDto,
	grpcJournalEntryOutputToJournalEntryDto,
	GrpcAccount__Output,
	GrpcJournalEntry__Output, GrpcId__Output
} from "@mojaloop/accounts-and-balances-bc-grpc-common-lib";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {
	UnableToCreateAccountError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "./errors";

export class GrpcClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly TIMEOUT_MS: number;
	// Other properties.
	private readonly client: AccountsAndBalancesGrpcServiceClient;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		timeoutMs: number
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.TIMEOUT_MS = timeoutMs;

		const packageDefinition: PackageDefinition = loadProto();
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		this.client = new (grpcObject as unknown as ProtoGrpcType).AccountsAndBalancesGrpcService(
			`${host}:${portNo}`,
			credentials.createInsecure()
		);
	}

	// TODO: make sure init is called.
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

	async createAccount(accountDto: IAccountDto): Promise<string> {
		return new Promise((resolve, reject) => {
			const grpcAccount: GrpcAccount = accountDtoToGrpcAccount(accountDto);

			this.client.createAccount(
				grpcAccount,
				(error, grpcIdOutput) => {
					if (error !== null) {
						reject(new UnableToCreateAccountError(error.details));
						return;
					}

					const accountId: string | undefined = grpcIdOutput?.grpcId;
					if (accountId === undefined) {
						reject(new UnableToCreateAccountError()); // TODO: message?
						return;
					}
					resolve(accountId);
				}
			);
		});
	}

	async createJournalEntries(journalEntryDtos: IJournalEntryDto[]): Promise<string[]> {
		return new Promise((resolve, reject) => {
			const grpcJournalEntries: GrpcJournalEntry[] = journalEntryDtos.map((journalEntryDto) => {
				return journalEntryDtoToGrpcJournalEntry(journalEntryDto);
			});
			const grpcJournalEntryArray: GrpcJournalEntryArray = {grpcJournalEntryArray: grpcJournalEntries};

			this.client.createJournalEntries(
				grpcJournalEntryArray,
				(error, grpcIdArrayOutput) => {
					if (error !== null) {
						reject(new UnableToCreateJournalEntriesError(error.details));
						return;
					}

					const grpcIdsOutput: GrpcId__Output[] | undefined = grpcIdArrayOutput?.grpcIdArray;
					if (grpcIdsOutput === undefined) {
						reject(new UnableToCreateJournalEntriesError()); // TODO: message?
						return;
					}

					const idsJournalEntries: string[] = grpcIdsOutput.map((grpcIdOutput) => {
						const journalEntryId: string | undefined = grpcIdOutput.grpcId;
						if (journalEntryId === undefined) {
							reject(new UnableToCreateJournalEntriesError()); // TODO: message?
							throw new Error(); // TODO: return?
						}
						return journalEntryId;
					});
					resolve(idsJournalEntries);
				}
			);
		});
	}

	async getAccountById(accountId: string): Promise<IAccountDto | null> {
		return new Promise((resolve, reject) => {
			const grpcAccountId: GrpcId = {grpcId: accountId};

			this.client.getAccountById(
				grpcAccountId,
				(error, grpcGetAccountByIdResponseOutput) => {
					if (error !== null) {
						reject(new UnableToGetAccountError(error.details));
						return;
					}

					const accountFound: boolean | undefined = grpcGetAccountByIdResponseOutput?.accountFound;
					if (accountFound === undefined) {
						reject(new UnableToGetAccountError()); // TODO: message?
						return;
					}
					if (!accountFound) {
						resolve(null);
					}

					const grpcAccountOutput: GrpcAccount__Output | undefined =
						grpcGetAccountByIdResponseOutput?.grpcAccount;
					if (grpcAccountOutput === undefined) {
						reject(new UnableToGetAccountError()); // TODO: message?
						return;
					}

					try {
						const accountDto: IAccountDto = grpcAccountOutputToAccountDto(grpcAccountOutput);
						resolve(accountDto);
					} catch (error: unknown) {
						reject(new UnableToGetAccountError()); // TODO: message?
					}
				}
			);
		});
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
		return new Promise((resolve, reject) => {
			const grpcExternalId: GrpcId = {grpcId: externalId};

			this.client.getAccountsByExternalId(
				grpcExternalId,
				(error, grpcGetAccountsByExternalIdResponseOutput) => {
					if (error !== null) {
						reject(new UnableToGetAccountsError(error.details));
						return;
					}

					const accountsFound: boolean | undefined = grpcGetAccountsByExternalIdResponseOutput?.accountsFound;
					if (accountsFound === undefined) {
						reject(new UnableToGetAccountsError()); // TODO: message?
						return;
					}
					if (!accountsFound) {
						resolve([]);
					}

					const grpcAccountsOutput: GrpcAccount__Output[] | undefined =
						grpcGetAccountsByExternalIdResponseOutput?.grpcAccounts;
					if (grpcAccountsOutput === undefined) {
						reject(new UnableToGetAccountsError()); // TODO: message?
						return;
					}

					try {
						const accountDtos: IAccountDto[] =
							grpcAccountsOutput.map((grpcAccountOutput) => {
								return grpcAccountOutputToAccountDto(grpcAccountOutput);
						});
						resolve(accountDtos);
					} catch (error: unknown) {
						reject(new UnableToGetAccountsError()); // TODO: message?
					}
				}
			);
		});
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDto[]> {
		return new Promise((resolve, reject) => {
			const grpcAccountId: GrpcId = {grpcId: accountId};

			this.client.getJournalEntriesByAccountId(
				grpcAccountId,
				(error, grpcGetJournalEntriesByAccountIdResponseOutput) => {
					if (error !== null) {
						reject(new UnableToGetJournalEntriesError(error.details));
						return;
					}

					const journalEntriesFound: boolean | undefined =
						grpcGetJournalEntriesByAccountIdResponseOutput?.journalEntriesFound;
					if (journalEntriesFound === undefined) {
						reject(new UnableToGetJournalEntriesError()); // TODO: message?
						return;
					}
					if (!journalEntriesFound) {
						resolve([]);
					}

					const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] | undefined =
						grpcGetJournalEntriesByAccountIdResponseOutput?.grpcJournalEntries;
					if (grpcJournalEntriesOutput === undefined) {
						reject(new UnableToGetJournalEntriesError()); // TODO: message?
						return;
					}

					try {
						const journalEntryDtos: IJournalEntryDto[] =
							grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
								return grpcJournalEntryOutputToJournalEntryDto(grpcJournalEntryOutput);
							});
						resolve(journalEntryDtos);
					} catch (error: unknown) {
						reject(new UnableToGetJournalEntriesError()); // TODO: message?
					}
				}
			);
		});
	}
}
