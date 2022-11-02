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
import {MongoClient, Collection, UpdateResult, Db, MongoServerError} from "mongodb";
import {
	IAccountsRepo,
	AccountAlreadyExistsError,
	NoSuchAccountError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToInitRepoError,
	UnableToStoreAccountError,
	UnableToUpdateAccountError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {MONGO_ACCOUNT_SCHEMA} from "./mongo_schemas";

export class MongoAccountsRepo implements IAccountsRepo {
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
				validator: {$jsonSchema: MONGO_ACCOUNT_SCHEMA}
			});
		} catch (error: unknown) {
			throw new UnableToInitRepoError((error as any)?.message);
		}
	}

	async destroy(): Promise<void> {
		await this.client.close(); // Doesn't throw if the server is unreachable.
	}

	async accountExistsById(accountId: string): Promise<boolean> {
		try {
			// findOne() doesn't throw if no item is found.
			const account: any = await this.collection.findOne({_id: accountId}); // TODO: investigate indexExists().
			return account !== null;
		} catch (error: unknown) {
			throw new UnableToGetAccountError((error as any)?.message);
		}
	}

	// When storing a new account, id and currencyDecimals can't be null. The domain should ensure that; however, those
	// properties should also be verified here, on the repo. Because of the schema, this doesn't need to be done "by
	// hand" - it's automatic, when calling insertOne(). TODO: clarify explanation.
	async storeNewAccount(accountDto: IAccountDto): Promise<void> {
		// Convert AccountDto's id to Mongo's _id. TODO: verify.
		const mongoAccountDto: any = {
			_id: accountDto.id,
			externalId: accountDto.externalId,
			state: accountDto.state,
			type: accountDto.type,
			currencyCode: accountDto.currencyCode,
			currencyDecimals: accountDto.currencyDecimals,
			debitBalance: accountDto.debitBalance,
			creditBalance: accountDto.creditBalance,
			timestampLastJournalEntry: accountDto.timestampLastJournalEntry
		};

		try {
			// insertOne() doesn't allow for duplicates.
			await this.collection.insertOne(mongoAccountDto);
		} catch (error: unknown) {
			if (error instanceof MongoServerError && error.code === MongoAccountsRepo.DUPLICATE_KEY_ERROR_CODE) { // TODO: should this be done?
				throw new AccountAlreadyExistsError();
			}
			throw new UnableToStoreAccountError((error as any)?.message);
		}
	}

	async getAccountById(accountId: string): Promise<IAccountDto | null> {
		let account: any;
		try {
			// findOne() doesn't throw if no item is found.
			account = await this.collection.findOne({_id: accountId}); // TODO: can this be simplified?
		} catch (error: unknown) {
			throw new UnableToGetAccountError((error as any)?.message);
		}

		// Convert Mongo's _id to AccountDto's id. TODO: verify; will id be placed at the end of the object?
		if (account !== null) {
			account.id = account._id;
			delete account._id;
		}
		return account;
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
		let accounts: any[];
		try {
			// find() doesn't throw if no items are found.
			accounts = await this.collection.find({externalId: externalId}).toArray();
		} catch (error: unknown) {
			throw new UnableToGetAccountsError((error as any)?.message);
		}

		// Convert Mongo's _id to AccountDto's id. TODO: verify; will id be placed at the end of the object?
		accounts.forEach((account) => {
			account.id = account._id;
			delete account._id;
		});
		return accounts;
	}

	async updateAccountDebitBalanceAndTimestampById(
		accountId: string,
		debitBalance: string,
		timestampLastJournalEntry: number): Promise<void> {

		let updateResult: UpdateResult;
		try {
			// updateOne() doesn't throw if no item is found.
			updateResult = await this.collection.updateOne(
				{_id: accountId},
				{$set: {debitBalance: debitBalance, timestampLastJournalEntry: timestampLastJournalEntry}}
			);
		} catch (error: unknown) {
			throw new UnableToUpdateAccountError((error as any)?.message);
		}

		if (updateResult.modifiedCount === 0) {
			throw new NoSuchAccountError();
		}
	}

	async updateAccountCreditBalanceAndTimestampById(
		accountId: string,
		creditBalance: string,
		timestampLastJournalEntry: number): Promise<void> {

		let updateResult: UpdateResult;
		try {
			// updateOne() doesn't throw if no item is found.
			updateResult = await this.collection.updateOne(
				{_id: accountId},
				{$set: {creditBalance: creditBalance, timestampLastJournalEntry: timestampLastJournalEntry}}
			);
		} catch (error: unknown) {
			throw new UnableToUpdateAccountError((error as any)?.message);
		}

		if (updateResult.modifiedCount === 0) {
			throw new NoSuchAccountError();
		}
	}
}
