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
import {MongoClient, Collection, DeleteResult, UpdateResult} from "mongodb";
import {
	IAccountsRepo,
	IAccount,
	AccountAlreadyExistsError,
	NoSuchAccountError,
	UnableToDeleteAccountError,
	UnableToDeleteAccountsError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToInitRepoError,
	UnableToStoreAccountError,
	UnableToUpdateAccountError
} from "@mojaloop/accounts-and-balances-bc-domain";

export class MongoAccountsRepo implements IAccountsRepo{
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly REPO_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly mongoClient: MongoClient;
	private accounts: Collection;

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

		this.mongoClient = new MongoClient(this.REPO_URL);
	}

	async init(): Promise<void> {
		try {
			await this.mongoClient.connect(); // Throws if the repo is unreachable.
		} catch (e: unknown) {
			throw new UnableToInitRepoError();
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
			throw new UnableToGetAccountError();
		}
	}

	async storeNewAccount(account: IAccount): Promise<void> {
		let accountExists: boolean;
		try {
			accountExists = await this.accountExistsById(account.id);
		} catch (e: unknown) {
			throw new UnableToStoreAccountError();
		}
		if (accountExists) {
			throw new AccountAlreadyExistsError();
		}
		try {
			// insertOne() allows for duplicates.
			await this.accounts.insertOne(account);
		} catch (e: unknown) {
			throw new UnableToStoreAccountError();
		}
	}

	async getAccountById(accountId: string): Promise<IAccount | null> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const account: any = await this.accounts.findOne( // TODO: type.
				{id: accountId},
				{projection: {_id: 0}} // Don't return the _id field. TODO: why is _id returned without this?
			);
			return account as unknown as IAccount; // TODO: create schema.
		} catch (e: unknown) {
			throw new UnableToGetAccountError();
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
			return accounts as unknown as IAccount[]; // TODO: create schema.
		} catch (e: unknown) {
			throw new UnableToGetAccountsError();
		}
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccount[]> {
		try {
			// find() doesn't throw if no items are found.
			const accounts: any = // TODO: type.
				await this.accounts
				.find(
					{externalId: externalId},
					{projection: {_id: 0}}) // Don't return the _id field.
				.toArray();
			return accounts as unknown as IAccount[]; // TODO: create schema.
		} catch (e: unknown) {
			throw new UnableToGetAccountsError();
		}
	}

	async updateAccountCreditBalanceById(
		accountId: string,
		creditBalance: bigint,
		timeStampLastJournalEntry: number): Promise<void> {
		let updateResult: UpdateResult;
		try {
			// updateOne() doesn't throw if no item is found.
			updateResult = await this.accounts.updateOne(
				{id: accountId},
				{$set: {creditBalance: creditBalance, timeStampLastJournalEntry: timeStampLastJournalEntry}}
			);
		} catch (e: unknown) {
			throw new UnableToUpdateAccountError();
		}
		if (updateResult.modifiedCount === 0) {
			throw new NoSuchAccountError();
		}
	}

	async updateAccountDebitBalanceById(
		accountId: string,
		debitBalance: bigint,
		timeStampLastJournalEntry: number): Promise<void> {
		let updateResult: UpdateResult;
		try {
			// updateOne() doesn't throw if no item is found.
			updateResult = await this.accounts.updateOne(
				{id: accountId},
				{$set: {debitBalance: debitBalance, timeStampLastJournalEntry: timeStampLastJournalEntry}}
			);
		} catch (e: unknown) {
			throw new UnableToUpdateAccountError();
		}
		if (updateResult.modifiedCount === 0) {
			throw new NoSuchAccountError();
		}
	}

	async deleteAccountById(accountId: string): Promise<void> {
		let deleteResult: DeleteResult;
		try {
			// deleteOne() doesn't throw if the item doesn't exist.
			deleteResult = await this.accounts.deleteOne({id: accountId});
		} catch (e: unknown) {
			throw new UnableToDeleteAccountError();
		}
		// deleteResult.acknowledged is true whether the item exists or not.
		if (deleteResult.deletedCount === 0) {
			throw new NoSuchAccountError();
		}
	}

	async deleteAllAccounts(): Promise<void> {
		try {
			// deleteMany() doesn't throw if no items exist.
			await this.accounts.deleteMany({}); // All documents.
		} catch (e: unknown) {
			throw new UnableToDeleteAccountsError();
		}
	}

}
