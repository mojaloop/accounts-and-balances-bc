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

import {IChartOfAccountsRepo} from "../domain/infrastructure-types/chart_of_accounts_repo";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Collection, Db, MongoClient, MongoServerError} from "mongodb";
import {
    AccountAlreadyExistsError,
    UnableToGetAccountsError,
    UnableToInitRepoError,
    UnableToStoreAccountsError
} from "../domain/errors";
import {CoaAccount} from "../domain/coa_account";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {BUILTIN_LEDGER_ACCOUNT_MONGO_SCHEMA} from "./builtin_ledger_accounts_mongo_repo";

export const BUILTIN_LEDGER_JOURNAL_ENTRY_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Built-in Ledger Journal Entry Mongo Schema",
    required: [
        "_id", // internalId.
        "externalId",
        "ownerId",
        "state",
        "type",
        "currencyCode",
        "currencyDecimals"
    ],
    properties: {
        // TODO: type vs bsonType; binData BSON type; check if _id can be replaced.
        _id: {/*type: "string",*/ bsonType: "string"},
        externalId: {/*type: "string",*/ bsonType: "string"},
        ownerId: {/*type: "string",*/ bsonType: "string"},
        state: {/*type: "string",*/ bsonType: "string"},
        type: {/*type: "string",*/ bsonType: "string"},
        currencyCode: {/*type: "string",*/ bsonType: "string"},
        currencyDecimals: {/*type: "number",*/ bsonType: "int"}
    },
    additionalProperties: false
};

export class BuiltinLedgerJournalEntriesMongoRepo implements IBuiltinLedgerJournalEntriesRepo {
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

    async init(): Promise<void> {
        try {
            // TODO: investigate other types of timeouts; configure TLS.
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
            // to be passed as an argument.
            if (collectionExists) {
                this.collection = db.collection(this.COLLECTION_NAME);
                return;
            }
            this.collection = await db.createCollection(this.COLLECTION_NAME, {
                validator: {$jsonSchema: ACCOUNT_MONGO_SCHEMA}
            });
        } catch (error: unknown) {
            throw new UnableToInitRepoError((error as any)?.message);
        }
    }

    async destroy(): Promise<void> {
        await this.client.close();
    }

    async accountsExistByInternalIds(internalIds: string[]): Promise<boolean> {
        let accounts: any[]; // TODO: verify type.
        try {
            accounts = await this.collection.find({_id: {$in: internalIds}}).toArray(); // TODO: verify filter; is there a simpler way to find by _id?
        } catch (error: unknown) {
            throw new UnableToGetAccountsError((error as any)?.message);
        }
        const accountsExist: boolean = accounts.length === internalIds.length;
        return accountsExist;
    }

    async storeAccounts(coaAccounts: CoaAccount[]): Promise<void> {
        // Convert CoaAccount's internalId to Mongo's _id.
        // TODO: is this the best way to do it?
        const mongoAccounts: any[] = coaAccounts.map((coaAccount) => { // TODO: verify type.
            return {
                _id: coaAccount.internalId,
                externalId: coaAccount.externalId,
                ownerId: coaAccount.ownerId,
                state: coaAccount.state,
                type: coaAccount.type,
                currencyCode: coaAccount.currencyCode,
                currencyDecimals: coaAccount.currencyDecimals
            };
        });

        try {
            await this.collection.insertMany(mongoAccounts);
        } catch (error: unknown) {
            if (
                error instanceof MongoServerError
                && error.code === ChartOfAccountsMongoRepo.DUPLICATE_KEY_ERROR_CODE
            ) { // TODO: should this be done?
                throw new AccountAlreadyExistsError();
            }
            throw new UnableToStoreAccountsError((error as any)?.message);
        }
    }

    async getAccountsByInternalIds(internalIds: string[]): Promise<CoaAccount[]> {
        let accounts: any[]; // TODO: verify type.
        try {
            accounts = await this.collection.find({_id: {$in: internalIds}}).toArray(); // TODO: verify filter; is there a simpler way to find by _id?
        } catch (error: unknown) {
            throw new UnableToGetAccountsError((error as any)?.message);
        }

        // Convert Mongo's _id to CoaAccount's internalId.
        // TODO: is this the best way to do it? will internalId be placed at the end of account?
        accounts.forEach((account) => {
            account.internalId = account._id;
            delete account._id;
        });
        return accounts;
    }

    async getAccountsByOwnerId(ownerId: string): Promise<CoaAccount[]> {
        let accounts: any[]; // TODO: verify type.
        try {
            accounts = await this.collection.find({ownerId: ownerId}).toArray();
        } catch (error: unknown) {
            throw new UnableToGetAccountsError((error as any)?.message);
        }

        // Convert Mongo's _id to CoaAccount's internalId.
        // TODO: is this the best way to do it? will internalId be placed at the end of account?
        accounts.forEach((account) => {
            account.internalId = account._id;
            delete account._id;
        });
        return accounts;
    }
}
