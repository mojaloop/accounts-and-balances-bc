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
import {Collection, Db, MongoClient, MongoServerError} from "mongodb";
import {
    JournalEntryAlreadyExistsError, UnableToGetJournalEntriesError,
    UnableToInitRepoError, UnableToStoreJournalEntryError,
} from "../domain/errors";
import {IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {BuiltinLedgerJournalEntry} from "../domain/entities";
import {bigintToString, stringToBigint} from "../domain/converters";

export const BUILTIN_LEDGER_JOURNAL_ENTRY_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Built-in Ledger Journal Entry Mongo Schema",
    required: [
        "_id", // id.
        "currencyCode",
        "currencyDecimals",
        "amount",
        "debitedAccountId",
        "creditedAccountId",
        "timestamp"
    ],
    properties: {
        properties: {
            // TODO:
            //  bsonType vs type;
            //  long and binData BSON types;
            //  check if _id can be replaced.
            _id: {bsonType: "string"},
            currencyCode: {bsonType: "string"},
            currencyDecimals: {bsonType: "int"},
            amount: {bsonType: "string"},
            debitedAccountId: {bsonType: "string"},
            creditedAccountId: {bsonType: "string"},
            timestamp: {bsonType: ["number"]}, // TODO: long instead of number?
        }
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
                validator: {$jsonSchema: BUILTIN_LEDGER_JOURNAL_ENTRY_MONGO_SCHEMA}
            });
        } catch (error: unknown) {
            throw new UnableToInitRepoError((error as any)?.message);
        }
    }

    async destroy(): Promise<void> {
        await this.client.close();
    }

    async storeNewJournalEntry(builtinLedgerJournalEntry: BuiltinLedgerJournalEntry): Promise<void> {
        // Convert BuiltinLedgerJournalEntry's id to Mongo's _id.
        // TODO: is this the best way to do it?
        const mongoJournalEntry: any = { // TODO: verify type.
            _id: builtinLedgerJournalEntry.id,
            currencyCode: builtinLedgerJournalEntry.currencyCode,
            currencyDecimals: builtinLedgerJournalEntry.currencyDecimals,
            amount: bigintToString(builtinLedgerJournalEntry.amount, builtinLedgerJournalEntry.currencyDecimals), // TODO: create an auxiliary variable?
            debitedAccountId: builtinLedgerJournalEntry.debitedAccountId,
            creditedAccountId: builtinLedgerJournalEntry.creditedAccountId,
            timestamp: builtinLedgerJournalEntry.timestamp
        };

        try {
            await this.collection.insertOne(mongoJournalEntry);
        } catch (error: unknown) {
            if (
                error instanceof MongoServerError
                && error.code === BuiltinLedgerJournalEntriesMongoRepo.DUPLICATE_KEY_ERROR_CODE
            ) { // TODO: should this be done?
                throw new JournalEntryAlreadyExistsError();
            }
            throw new UnableToStoreJournalEntryError((error as any)?.message);
        }
    }

    async getJournalEntriesByAccountId(accountId: string): Promise<BuiltinLedgerJournalEntry[]> {
        let journalEntries: any[]; // TODO: verify type.
        try {
            journalEntries = await this.collection.find(
                {$or: [{debitedAccountId: accountId}, {creditedAccountId: accountId}]}
            ).toArray();
        } catch (error: unknown) {
            throw new UnableToGetJournalEntriesError((error as any)?.message);
        }

        // Convert Mongo's _id to BuiltinLedgerJournalEntry's id.
        // TODO: is this the best way to do it? will id be placed at the end of journalEntry?
        journalEntries.forEach((journalEntry) => {
            journalEntry.id = journalEntry._id;
            delete journalEntry._id;

            journalEntry.amount = stringToBigint(journalEntry.amount, journalEntry.currencyDecimals); // TODO: create an auxiliary variable?
        });
        return journalEntries;
    }
}
