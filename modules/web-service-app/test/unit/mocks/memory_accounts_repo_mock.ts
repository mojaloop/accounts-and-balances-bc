/*
/!*****
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
 ******!/

"use strict";

import {
	IAccount,
	IAccountsRepo,
	JournalEntryAlreadyExistsError,
	NoSuchJournalEntryError
} from "@mojaloop/accounts-and-balances-bc-domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class MemoryAccountsRepo implements IAccountsRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly REPO_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly accounts: Map<string, IAccount>;

	constructor(
		logger: ILogger,
		REPO_URL: string,
		DB_NAME: string,
		COLLECTION_NAME: string
	) {
		this.logger = logger;
		this.REPO_URL = REPO_URL;
		this.DB_NAME = DB_NAME;
		this.COLLECTION_NAME = COLLECTION_NAME;

		this.accounts = new Map<string, IAccount>();
	}

	async init(): Promise<void> {
	}

	async destroy(): Promise<void> {
	}

	async accountExistsById(accountId: string): Promise<boolean> {
		return this.accounts.has(accountId);
	}

	async storeNewAccount(account: IAccount): Promise<void> {
		if (this.accounts.has(account.id)) {
			throw new JournalEntryAlreadyExistsError();
		}
		this.accounts.set(account.id, account);
	}

	async getAccountById(accountId: string): Promise<IAccount | null> {
		return this.accounts.get(accountId) ?? null;
	}

	async getAllAccounts(): Promise<IAccount[]> {
		return [...this.accounts.values()];
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccount[]> {
	}

	async updateAccountCreditBalanceById(accountId: string, creditBalance: bigint, timeStampLastJournalEntry: number): Promise<void> {
	}

	async updateAccountDebitBalanceById(accountId: string, debitBalance: bigint, timeStampLastJournalEntry: number): Promise<void> {
	}

	async deleteAccountById(accountId: string): Promise<void> {
		if (!this.accounts.delete(accountId)) {
			throw new NoSuchJournalEntryError();
		}
	}

	async deleteAllAccounts(): Promise<void> {
	}
}
*/
