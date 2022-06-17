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
import {IAccount} from "@mojaloop/accounts-and-balances-public-types";
import {MongoClient, Collection, DeleteResult} from "mongodb";
import {
	AccountAlreadyExistsError, NoSuchAccountError, UnableToDeleteAccountError,
	UnableToGetAccountError, UnableToGetAccountsError,
	UnableToInitRepoError,
	UnableToStoreAccountError
} from "../domain/errors";

export class MongoRepo implements IRepo {
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
			throw new UnableToInitRepoError(); // TODO.
		}
		// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
		this.accounts = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
	}

	async destroy(): Promise<void> {
		await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
	}

	async accountExists(accountId: string): Promise<boolean> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const account: any = await this.accounts.findOne({id: accountId}); // TODO: type.
			return account !== null;
		} catch (e: unknown) {
			throw new UnableToGetAccountError();
		}
	}

	async storeAccount(account: IAccount): Promise<void> {
		try {
			// insertOne() allows for duplicates.
			if (await this.accountExists(account.id)) { // TODO: call class's function?
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

	async getAccount(accountId: string): Promise<IAccount | null> {
		try {
			// findOne() doesn't throw if no item is found - null is returned.
			const account: any = await this.accounts.findOne({id: accountId}); // TODO: type.
			return account as unknown as IAccount; // TODO.
		} catch (e: unknown) {
			throw new UnableToGetAccountError();
		}
	}

	async getAccounts(): Promise<IAccount[]> {
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

	async deleteAccount(accountId: string): Promise<void> {
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
}
