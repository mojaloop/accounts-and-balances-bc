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
import {MongoClient, Collection} from "mongodb";
import {
	IJournalEntry,
	IJournalEntriesRepo,
	JournalEntryAlreadyExistsError,
	UnableToGetJournalEntriesError,
	UnableToGetJournalEntryError,
	UnableToInitRepoError,
	UnableToStoreJournalEntryError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";

export class MongoJournalEntriesRepo implements IJournalEntriesRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly mongoClient: MongoClient;
	private journalEntries: Collection;

	constructor(
		logger: ILogger,
		dbUrl: string,
		dbName: string,
		collectionName: string
	) {
		this.logger = logger;
		this.DB_URL = dbUrl;
		this.DB_NAME = dbName;
		this.COLLECTION_NAME = collectionName;

		this.mongoClient = new MongoClient(this.DB_URL);
	}

	async init(): Promise<void> {
		try {
			await this.mongoClient.connect(); // Throws if the repo is unreachable.
		} catch (e: unknown) {
			throw new UnableToInitRepoError((e as any)?.message);
		}
		// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
		this.journalEntries = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
	}

	async destroy(): Promise<void> {
		await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
	}

	async journalEntryExistsById(journalEntryId: string): Promise<boolean> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const journalEntry: any = await this.journalEntries.findOne({id: journalEntryId}); // TODO: type.
			return journalEntry !== null;
		} catch (e: unknown) {
			throw new UnableToGetJournalEntryError((e as any)?.message);
		}
	}

	async storeNewJournalEntry(journalEntry: IJournalEntry): Promise<void> {
		let journalEntryExists: boolean;
		try {
			journalEntryExists = await this.journalEntryExistsById(journalEntry.id);
		} catch (e: unknown) {
			throw new UnableToStoreJournalEntryError((e as any)?.message);
		}
		if (journalEntryExists) {
			throw new JournalEntryAlreadyExistsError();
		}
		try {
			// insertOne() allows for duplicates.
			await this.journalEntries.insertOne(journalEntry);
		} catch (e: unknown) {
			throw new UnableToStoreJournalEntryError((e as any)?.message);
		}
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntry[]> {
		try {
			// find() doesn't throw if no items are found.
			const journalEntries: any = // TODO: type.
				await this.journalEntries
				.find(
					{$or: [{creditedAccountId: accountId}, {debitedAccountId: accountId}]},
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return journalEntries as unknown as IJournalEntry[]; // TODO: create schema.
		} catch (e: unknown) {
			throw new UnableToGetJournalEntriesError((e as any)?.message);
		}
	}
}
