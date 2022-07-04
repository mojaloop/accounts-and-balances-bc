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

import {IRepo} from "../domain/infrastructure-interfaces/irepo";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAccount, IJournalEntry} from "@mojaloop/accounts-and-balances-private-types";
import {MongoClient, Collection, DeleteResult, UpdateResult, Document} from "mongodb";
import {
	AccountAlreadyExistsError,
	JournalEntryAlreadyExistsError,
	NoSuchAccountError,
	NoSuchJournalEntryError,
	UnableToDeleteAccountError,
	UnableToDeleteAccountsError,
	UnableToDeleteJournalEntriesError,
	UnableToDeleteJournalEntryError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError,
	UnableToGetJournalEntryError,
	UnableToInitRepoError,
	UnableToStoreAccountError,
	UnableToStoreJournalEntryError, UnableToUpdateAccountError
} from "../domain/errors";

export class MongoRepo implements IRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly REPO_URL: string;
	private readonly DB_NAME: string;
	private readonly ACCOUNTS_COLLECTION_NAME: string;
	private readonly JOURNAL_ENTRIES_COLLECTION_NAME: string;
	// Other properties.
	private readonly mongoClient: MongoClient;
	private accounts: Collection;
	private journalEntries: Collection;

	constructor(
		logger: ILogger,
		REPO_URL: string,
		DB_NAME: string,
		ACCOUNTS_COLLECTION_NAME: string, // TODO.
		JOURNAL_ENTRIES_COLLECTION_NAME: string // TODO.
	) {
		this.logger = logger;
		this.REPO_URL = REPO_URL;
		this.DB_NAME = DB_NAME;
		this.ACCOUNTS_COLLECTION_NAME = ACCOUNTS_COLLECTION_NAME;
		this.JOURNAL_ENTRIES_COLLECTION_NAME = JOURNAL_ENTRIES_COLLECTION_NAME;

		this.mongoClient = new MongoClient(this.REPO_URL);
	}

	async init(): Promise<void> {
		try {
			await this.mongoClient.connect(); // Throws if the repo is unreachable.
		} catch (e: unknown) {
			throw new UnableToInitRepoError(); // TODO.
		}
		// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
		this.accounts = this.mongoClient.db(this.DB_NAME).collection(this.ACCOUNTS_COLLECTION_NAME);
		this.journalEntries = this.mongoClient.db(this.DB_NAME).collection(this.JOURNAL_ENTRIES_COLLECTION_NAME);
	}

	async destroy(): Promise<void> {
		await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
	}

	async accountExistsById(accountId: string): Promise<boolean> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const account: any = await this.accounts.findOne({id: accountId}); // TODO: type.
			return account !== null;
		} catch (e: unknown) {
			throw new UnableToGetAccountError();
		}
	}

	async journalEntryExistsById(journalEntryId: string): Promise<boolean> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const journalEntry: any = await this.journalEntries.findOne({id: journalEntryId}); // TODO: type.
			return journalEntry !== null;
		} catch (e: unknown) {
			throw new UnableToGetJournalEntryError();
		}
	}

	async storeAccount(account: IAccount): Promise<void> {
		try {
			// insertOne() allows for duplicates.
			if (await this.accountExistsById(account.id)) {
				throw new AccountAlreadyExistsError(); // TODO: throw inside try?
			}
			await this.accounts.insertOne(account);
		} catch (e: unknown) {
			if (e instanceof AccountAlreadyExistsError) {
				throw e;
			}
			throw new UnableToStoreAccountError();
		}
	}

	async storeJournalEntry(journalEntry: IJournalEntry): Promise<void> {
		try {
			// insertOne() allows for duplicates.
			if (await this.journalEntryExistsById(journalEntry.id)) {
				throw new JournalEntryAlreadyExistsError(); // TODO: throw inside try?
			}
			await this.journalEntries.insertOne(journalEntry);
		} catch (e: unknown) {
			if (e instanceof JournalEntryAlreadyExistsError) {
				throw e;
			}
			throw new UnableToStoreJournalEntryError();
		}
	}

	async getAccountById(accountId: string): Promise<IAccount | null> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const account: any = await this.accounts.findOne( // TODO: type.
				{id: accountId},
				{projection: {_id: 0}} // Don't return the _id field. TODO: why is _id returned without this?
			);
			return account as unknown as IAccount; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetAccountError();
		}
	}

	async getJournalEntryById(journalEntryId: string): Promise<IJournalEntry | null> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const journalEntry: any = await this.journalEntries.findOne( // TODO: type.
				{id: journalEntryId},
				{projection: {_id: 0}} // Don't return the _id field. TODO: why is _id returned without this?
			);
			return journalEntry as unknown as IJournalEntry; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetJournalEntryError();
		}
	}

	async getAllAccounts(): Promise<IAccount[]> {
		try {
			// find() doesn't throw if no items are found.
			const accounts: any = // TODO: type.
				await this.accounts
				.find(
					{}, // All documents.
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return accounts as unknown as IAccount[]; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetAccountsError();
		}
	}

	async getAllJournalEntries(): Promise<IJournalEntry[]> {
		try {
			// find() doesn't throw if no items are found.
			const journalEntries: any = // TODO: type.
				await this.journalEntries
				.find(
					{}, // All documents.
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return journalEntries as unknown as IJournalEntry[]; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetJournalEntriesError();
		}
	}

	// TODO.
	async getAccountsByExternalId(externalId: string): Promise<IAccount[]> {
		try {
			// find() doesn't throw if no items are found.
			const accounts: any = // TODO: type.
				await this.accounts
				.find(
					{externalId: externalId}, // TODO.
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return accounts as unknown as IAccount[]; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetJournalEntriesError();
		}
	}

	// TODO.
	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntry[]> {
		try {
			// find() doesn't throw if no items are found.
			const journalEntries: any = // TODO: type.
				await this.journalEntries
				.find(
					{$or: [{creditedAccountId: accountId}, {debitedAccountId: accountId}]}, // TODO.
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return journalEntries as unknown as IJournalEntry[]; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetJournalEntriesError();
		}
	}

	// TODO.
	async updateAccountCreditBalanceById(
		accountId: string,
		creditBalance: bigint,
		timeStampLastJournalEntry: number): Promise<void> {
		try {
			// updateOne() doesn't throw if no item is found.
			const updateResult: UpdateResult = await this.accounts.updateOne(
				{id: accountId},
				{$set: {creditBalance: creditBalance, timeStampLastJournalEntry: timeStampLastJournalEntry}} // TODO.
			);
			if (updateResult.modifiedCount === 0) {
				throw new NoSuchAccountError(); // TODO: throw inside try?
			}
		} catch (e: unknown) {
			if (e instanceof NoSuchAccountError) {
				throw e;
			}
			throw new UnableToUpdateAccountError();
		}
	}

	// TODO.
	async updateAccountDebitBalanceById(
		accountId: string,
		debitBalance: bigint,
		timeStampLastJournalEntry: number): Promise<void> {
		try {
			// updateOne() doesn't throw if no item is found.
			const updateResult: UpdateResult = await this.accounts.updateOne(
				{id: accountId},
				{$set: {debitBalance: debitBalance, timeStampLastJournalEntry: timeStampLastJournalEntry}} // TODO.
			);
			if (updateResult.modifiedCount === 0) {
				throw new NoSuchAccountError(); // TODO: throw inside try?
			}
		} catch (e: unknown) {
			if (e instanceof NoSuchAccountError) {
				throw e;
			}
			throw new UnableToUpdateAccountError();
		}
	}

	async deleteAccountById(accountId: string): Promise<void> {
		try {
			// deleteOne() doesn't throw if the item doesn't exist.
			const deleteResult: DeleteResult = await this.accounts.deleteOne({id: accountId});
			// deleteResult.acknowledged is true whether the item exists or not.
			if (deleteResult.deletedCount === 0) {
				throw new NoSuchAccountError(); // TODO: throw inside try?
			}
		} catch (e: unknown) {
			if (e instanceof NoSuchAccountError) {
				throw e;
			}
			throw new UnableToDeleteAccountError();
		}
	}

	async deleteJournalEntryById(journalEntryId: string): Promise<void> {
		try {
			// deleteOne() doesn't throw if the item doesn't exist.
			const deleteResult: DeleteResult = await this.journalEntries.deleteOne({id: journalEntryId});
			// deleteResult.acknowledged is true whether the item exists or not.
			if (deleteResult.deletedCount === 0) {
				throw new NoSuchJournalEntryError(); // TODO: throw inside try?
			}
		} catch (e: unknown) {
			if (e instanceof NoSuchJournalEntryError) {
				throw e;
			}
			throw new UnableToDeleteJournalEntryError();
		}
	}

	// TODO.
	async deleteAllAccounts(): Promise<void> {
		try {
			// deleteMany() doesn't throw if no items exist.
			await this.accounts.deleteMany({}); // All documents.
		} catch (e: unknown) {
			throw new UnableToDeleteAccountsError();
		}
	}

	// TODO.
	async deleteAllJournalEntries(): Promise<void> {
		try {
			// deleteMany() doesn't throw if no items exist.
			await this.journalEntries.deleteMany({}); // All documents.
		} catch (e: unknown) {
			throw new UnableToDeleteJournalEntriesError();
		}
	}
}
