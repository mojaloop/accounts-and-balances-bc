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
import * as uuid from "uuid";
import {
	AccountAlreadyExistsError,
	InvalidAccountIdTypeError,
	InvalidJournalEntryIdTypeError,
	JournalEntryAlreadyExistsError, NoSuchAccountError, NoSuchJournalEntryError
} from "./errors";
import {IRepo} from "./infrastructure-interfaces/irepo";
import {Account, JournalEntry} from "./types";

export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly repo: IRepo;
	// Other properties.

	constructor(
		logger: ILogger,
		repo: IRepo
	) {
		this.logger = logger;
		this.repo = repo;
	}

	async init(): Promise<void> {
		try {
			await this.repo.init();
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e; // No need to be specific.
		}
	}

	async destroy(): Promise<void> {
		await this.repo.destroy();
	}

	async createAccount(account: Account): Promise<string> { // TODO: Account or IAccount?
		// To facilitate the creation of accounts, undefined/null ids are accepted and converted to empty strings
		// (so that random UUIds are generated).
		if (account.id === undefined || account.id === null) { // TODO.
			account.id = "";
		}
		Account.validateAccount(account);
		try {
			if (account.id === "") {
				do {
					account.id = uuid.v4();
				} while (await this.repo.accountExists(account.id));
			}
			await this.repo.storeAccount(account);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof AccountAlreadyExistsError)) {
				this.logger.error(e);
			}
			throw e;
		}
		// TODO: save the accounts in memory?
		return account.id;
	}

	async createJournalEntry(journalEntry: JournalEntry): Promise<string> { // TODO: JournalEntry or IJournalEntry?
		// To facilitate the creation of journal entries, undefined/null ids are accepted and converted to empty
		// strings (so that random UUIds are generated).
		if (journalEntry.id === undefined || journalEntry.id === null) { // TODO.
			journalEntry.id = "";
		}
		JournalEntry.validateJournalEntry(journalEntry);
		try {
			if (journalEntry.id === "") {
				do {
					journalEntry.id = uuid.v4();
				} while (await this.repo.journalEntryExists(journalEntry.id));
			}
			await this.repo.storeJournalEntry(journalEntry);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof JournalEntryAlreadyExistsError)) {
				this.logger.error(e);
			}
			throw e;
		}
		// TODO: save the journal entries in memory?
		return journalEntry.id;
	}

	async getAccount(accountId: string): Promise<Account | null> { // TODO: Account or IAccount?
		if (typeof accountId !== "string") { // TODO.
			throw new InvalidAccountIdTypeError();
		}
		try {
			return await this.repo.getAccount(accountId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	async getJournalEntry(journalEntryId: string): Promise<JournalEntry | null> { // TODO: JournalEntry or IJournalEntry?
		if (typeof journalEntryId !== "string") { // TODO.
			throw new InvalidJournalEntryIdTypeError();
		}
		try {
			return await this.repo.getJournalEntry(journalEntryId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	async getAccounts(): Promise<Account[]> { // TODO: Account or IAccount?
		try {
			return await this.repo.getAccounts();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	async getJournalEntries(): Promise<JournalEntry[]> { // TODO: JournalEntry or IJournalEntry?
		try {
			return await this.repo.getJournalEntries();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	async deleteAccount(accountId: string): Promise<void> {
		if (typeof accountId !== "string") { // TODO.
			throw new InvalidAccountIdTypeError();
		}
		try {
			await this.repo.deleteAccount(accountId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchAccountError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	async deleteJournalEntry(journalEntryId: string): Promise<void> {
		if (typeof journalEntryId !== "string") { // TODO.
			throw new InvalidJournalEntryIdTypeError();
		}
		try {
			await this.repo.deleteJournalEntry(journalEntryId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchJournalEntryError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	async deleteAccounts(): Promise<void> {
		try {
			await this.repo.deleteAccounts();
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}

	async deleteJournalEntries(): Promise<void> {
		try {
			await this.repo.deleteJournalEntries();
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}
}
