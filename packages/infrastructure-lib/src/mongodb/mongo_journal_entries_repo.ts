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
import {MongoClient, Collection, Db, MongoServerError} from "mongodb";
import {
	IJournalEntriesRepo,
	JournalEntryAlreadyExistsError,
	UnableToGetJournalEntriesError,
	UnableToGetJournalEntryError,
	UnableToInitRepoError,
	UnableToStoreJournalEntryError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {MONGO_JOURNAL_ENTRY_SCHEMA} from "./mongo_schemas";

export class MongoJournalEntriesRepo implements IJournalEntriesRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	private readonly TIMEOUT_MS: number;
	private readonly USERNAME: string; // TODO: store the username here?
	private readonly PASSWORD: string; // TODO: store the password here?
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private static readonly DUPLICATE_KEY_ERROR_CODE: number = 11000;
	private client: MongoClient;
	private collection: Collection;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		timeoutMs: number,
		username: string,
		password: string,
		dbName: string,
		collectionName: string
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.HOST = host;
		this.PORT_NO = portNo;
		this.TIMEOUT_MS = timeoutMs;
		this.USERNAME = username;
		this.PASSWORD = password;
		this.DB_NAME = dbName;
		this.COLLECTION_NAME = collectionName;
	}

	// TODO: make sure init is called.
	async init(): Promise<void> {
		try {
			// TODO: should this be here given that it isn't async (I did it bc of the UnableToInit error)? verify other types of timeouts; configure TLS.
			this.client = new MongoClient(`mongodb://${this.HOST}:${this.PORT_NO}`, {
				serverSelectionTimeoutMS: this.TIMEOUT_MS,
				auth: {
					username: this.USERNAME,
					password: this.PASSWORD
				}
			});
			await this.client.connect();

			const db: Db = this.client.db(this.DB_NAME);

			// Check if the collection already exists.
			const collections: any[] = await db.listCollections().toArray(); // TODO: verify type.
			const collectionExists: boolean = collections.some((collection) => {
				return collection.name === this.COLLECTION_NAME;
			});

			// collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
			// to be passed as an argument, therefore, createCollection() has to be used. TODO: clarify explanation.
			if (collectionExists) {
				this.collection = db.collection(this.COLLECTION_NAME);
				return;
			}
			this.collection = await db.createCollection(this.COLLECTION_NAME, {
				validator: {$jsonSchema: MONGO_JOURNAL_ENTRY_SCHEMA}
			});
		} catch (error: unknown) {
			throw new UnableToInitRepoError((error as any)?.message);
		}
	}

	async destroy(): Promise<void> {
		await this.client.close(); // Doesn't throw if the server is unreachable.
	}

	async journalEntryExistsById(journalEntryId: string): Promise<boolean> {
		try {
			// findOne() doesn't throw if no item is found.
			const journalEntry: any = await this.collection.findOne({_id: journalEntryId}); // TODO: investigate indexExists().
			return journalEntry !== null;
		} catch (error: unknown) {
			throw new UnableToGetJournalEntryError((error as any)?.message);
		}
	}

	async storeNewJournalEntry(journalEntryDto: IJournalEntryDto): Promise<void> {
		// Convert JournalEntryDto's id to Mongo's _id. TODO: verify.
		const mongoJournalEntryDto: any = {
			_id: journalEntryDto.id,
			externalId: journalEntryDto.externalId,
			externalCategory: journalEntryDto.externalCategory,
			currencyCode: journalEntryDto.currencyCode,
			currencyDecimals: journalEntryDto.currencyDecimals,
			amount: journalEntryDto.amount,
			debitedAccountId: journalEntryDto.debitedAccountId,
			creditedAccountId: journalEntryDto.creditedAccountId,
			timestamp: journalEntryDto.timestamp
		};

		try {
			// insertOne() doesn't allow for duplicates.
			await this.collection.insertOne(mongoJournalEntryDto);
		} catch (error: unknown) {
			if (error instanceof MongoServerError && error.code === MongoJournalEntriesRepo.DUPLICATE_KEY_ERROR_CODE) { // TODO: should this be done?
				throw new JournalEntryAlreadyExistsError();
			}
			throw new UnableToStoreJournalEntryError((error as any)?.message);
		}
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDto[]> {
		let journalEntries: any[];
		try {
			// find() doesn't throw if no items are found.
			journalEntries = await this.collection.find(
				{$or: [{debitedAccountId: accountId}, {creditedAccountId: accountId}]}
			).toArray();
		} catch (error: unknown) {
			throw new UnableToGetJournalEntriesError((error as any)?.message);
		}

		// Convert Mongo's _id to JournalEntryDto's id. TODO: verify; will id be placed at the end of the object?
		journalEntries.forEach((journalEntry) => {
			journalEntry.id = journalEntry._id;
			delete journalEntry._id;
		});
		return journalEntries;
	}
}
