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
import {MongoClient, Collection, UpdateResult} from "mongodb";
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

export class MongoAccountsRepo implements IAccountsRepo{
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly mongoClient: MongoClient;
	private accounts: Collection;

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

		this.mongoClient = new MongoClient(this.DB_URL, {
			connectTimeoutMS: 5_000,
			socketTimeoutMS: 5_000
		});
	}

	async init(): Promise<void> {
		try {
			await this.mongoClient.connect(); // Throws if the repo is unreachable.
		} catch (e: unknown) {
			throw new UnableToInitRepoError((e as any)?.message);
		}
		// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
		this.accounts = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
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
			throw new UnableToGetAccountError((e as any)?.message);
		}
	}

	async storeNewAccount(account: IAccountDto): Promise<void> {
		let accountExists: boolean;
		try {
			accountExists = await this.accountExistsById(account.id);
		} catch (e: unknown) {
			throw new UnableToStoreAccountError((e as any)?.message);
		}
		if (accountExists) {
			throw new AccountAlreadyExistsError();
		}
		try {
			// insertOne() allows for duplicates.
			await this.accounts.insertOne(account);
		} catch (e: unknown) {
			throw new UnableToStoreAccountError((e as any)?.message);
		}
	}

	async getAccountById(accountId: string): Promise<IAccountDto | null> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const account: any = await this.accounts.findOne( // TODO: type.
				{id: accountId},
				{projection: {_id: 0}} // Don't return the _id field. TODO: why is _id returned without this?
			);
			return account as unknown as IAccountDto; // TODO: create schema.
		} catch (e: unknown) {
			throw new UnableToGetAccountError((e as any)?.message);
		}
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
		try {
			// find() doesn't throw if no items are found.
			const accounts: any = // TODO: type.
				await this.accounts
				.find(
					{externalId: externalId},
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return accounts as unknown as IAccountDto[]; // TODO: create schema.
		} catch (e: unknown) {
			throw new UnableToGetAccountsError((e as any)?.message);
		}
	}

	async updateAccountCreditBalanceById(
		accountId: string,
		creditBalance: string,
		timeStampLastJournalEntry: number): Promise<void> {
		let updateResult: UpdateResult;
		try {
			// updateOne() doesn't throw if no item is found.
			updateResult = await this.accounts.updateOne(
				{id: accountId},
				{$set: {creditBalance: creditBalance, timeStampLastJournalEntry: timeStampLastJournalEntry}}
			);
		} catch (e: unknown) {
			throw new UnableToUpdateAccountError((e as any)?.message);
		}
		if (updateResult.modifiedCount === 0) {
			throw new NoSuchAccountError();
		}
	}

	async updateAccountDebitBalanceById(
		accountId: string,
		debitBalance: string,
		timeStampLastJournalEntry: number): Promise<void> {
		let updateResult: UpdateResult;
		try {
			// updateOne() doesn't throw if no item is found.
			updateResult = await this.accounts.updateOne(
				{id: accountId},
				{$set: {debitBalance: debitBalance, timeStampLastJournalEntry: timeStampLastJournalEntry}}
			);
		} catch (e: unknown) {
			throw new UnableToUpdateAccountError((e as any)?.message);
		}
		if (updateResult.modifiedCount === 0) {
			throw new NoSuchAccountError();
		}
	}
}
