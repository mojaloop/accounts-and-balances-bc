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
	AccountAlreadyExistsError, CreditedAccountAndDebitedAccountCurrenciesDifferError,
	InvalidAccountIdTypeError,
	InvalidJournalEntryIdTypeError,
	JournalEntryAlreadyExistsError,
	NoSuchAccountError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	NoSuchJournalEntryError
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
		// (so that random UUIds are generated when storing the accounts).
		if (account.id === undefined || account.id === null) { // TODO.
			account.id = "";
		}
		// TODO.
		// To facilitate the creation of accounts, undefined/null balances are accepted and automatically calculated
		// based on the credit and debit balances provided (balance = creditBalance - debitBalance).
		/*if (account.balance === undefined || account.balance === null) { // TODO.
			account.balance = account.creditBalance - account.debitBalance;
		}*/
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
		return account.id;
	}

	async createJournalEntry(journalEntry: JournalEntry): Promise<string> { // TODO: JournalEntry or IJournalEntry?
		// To facilitate the creation of journal entries, undefined/null ids are accepted and converted to empty
		// strings (so that random UUIds are generated when storing the journal entries).
		if (journalEntry.id === undefined || journalEntry.id === null) { // TODO.
			journalEntry.id = "";
		}
		JournalEntry.validateJournalEntry(journalEntry);
		// Check if the credited and debited accounts exist and if their currencies match.
		// Instead of using the repo's accountExists and journalEntryExists functions, the accounts are fetched and
		// compared to null; this is done because the accounts' balances and time stamps need to be updated when a
		// journal entry is created, so it doesn't make sense to call those functions when the accounts need to be
		// fetched anyway.
		let creditedAccount: Account | null; // TODO: Account or IAccount?
		let debitedAccount: Account | null; // TODO: Account or IAccount?
		try {
			creditedAccount = await this.repo.getAccount(journalEntry.creditedAccountId);
			if (creditedAccount === null) {
				throw new NoSuchCreditedAccountError(); // TODO: throw inside try?
			}
			debitedAccount = await this.repo.getAccount(journalEntry.debitedAccountId);
			if (debitedAccount === null) {
				throw new NoSuchDebitedAccountError(); // TODO: throw inside try?
			}
			if (creditedAccount.currency !== debitedAccount.currency) {
				throw new CreditedAccountAndDebitedAccountCurrenciesDifferError(); // TODO: throw inside try?
			}
		} catch (e: unknown) {
			if (!(e instanceof NoSuchCreditedAccountError)
				&& !(e instanceof NoSuchDebitedAccountError)
				&& !(e instanceof CreditedAccountAndDebitedAccountCurrenciesDifferError)) {
				this.logger.error(e);
			}
			throw e;
		}
		// Generate a random UUId, if needed, and store the journal entry.
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
		// Update the accounts' balances.
		creditedAccount.creditBalance += journalEntry.amount; // TODO.
		creditedAccount.balance += journalEntry.amount; // TODO.
		debitedAccount.debitBalance += journalEntry.amount; // TODO.
		debitedAccount.balance -= journalEntry.amount; // TODO.
		// Update the accounts' time stamps.
		creditedAccount.timeStampLastJournalEntry = journalEntry.timeStamp;
		debitedAccount.timeStampLastJournalEntry = journalEntry.timeStamp;
		try {
			await this.repo.updateAccount(creditedAccount); // TODO.
			await this.repo.updateAccount(debitedAccount); // TODO.
		} catch (e: unknown) {
			// TODO: revert.
			this.logger.error(e); // TODO.
			throw e;
		}
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
