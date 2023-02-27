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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Collection, Db, MongoClient, MongoServerError} from "mongodb";
import {IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {BuiltinLedgerJournalEntry} from "../domain/entities";
import {bigintToString, stringToBigint} from "../domain/converters";

export const BUILTIN_LEDGER_JOURNAL_ENTRY_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Built-in Ledger Journal Entry Mongo Schema",
    required: [
        "_id",
        "id",
        "currencyCode",
        "currencyDecimals",
        "amount",
        "pending",
        "debitedAccountId",
        "creditedAccountId",
        "timestamp"
    ],
    properties: {
        _id: {"bsonType": "objectId"},
        id: {bsonType: "string"},
        currencyCode: {bsonType: "string"},
        currencyDecimals: {bsonType: "int"},
        amount: {bsonType: "string"},
        pending: {bsonType: "bool"},
        debitedAccountId: {bsonType: "string"},
        creditedAccountId: {bsonType: "string"},
        timestamp: {bsonType: ["number"]},
    },
    additionalProperties: false
};

export class BuiltinLedgerJournalEntriesMongoRepo implements IBuiltinLedgerJournalEntriesRepo {
    // Properties received through the constructor.
    private readonly _logger: ILogger;
    private readonly _url: string;
    // Other properties.
    private static readonly TIMEOUT_MS: number = 5_000;
    private static readonly DB_NAME: string = "accounts_and_balances_bc_builtin_ledger";
    private static readonly COLLECTION_NAME: string = "journal_entries";
    private static readonly DUPLICATE_KEY_ERROR_CODE: number = 11000;
    private _client: MongoClient;
    private _collection: Collection;

    constructor(
        logger: ILogger,
        url: string
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._url = url;
    }

    async init(): Promise<void> {
        try {
            // TODO: investigate other types of timeouts; configure TLS.
            this._client = new MongoClient(this._url, {
                serverSelectionTimeoutMS: BuiltinLedgerJournalEntriesMongoRepo.TIMEOUT_MS
            });
            await this._client.connect();

            const db: Db = this._client.db(BuiltinLedgerJournalEntriesMongoRepo.DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray();
            const exists: boolean = collections.find((collection) => collection.name===BuiltinLedgerJournalEntriesMongoRepo.COLLECTION_NAME);

            // collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
            // to be passed as an argument.
            if (exists) {
                this._collection = db.collection(BuiltinLedgerJournalEntriesMongoRepo.COLLECTION_NAME);
                return;
            }

            this._collection = await db.createCollection(BuiltinLedgerJournalEntriesMongoRepo.COLLECTION_NAME, {
                validator: {$jsonSchema: BUILTIN_LEDGER_JOURNAL_ENTRY_MONGO_SCHEMA}
            });
            await this._collection.createIndex({"id": 1}, {unique: true});
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }

    async destroy(): Promise<void> {
        await this._client.close();
    }

    async storeNewJournalEntry(builtinLedgerJournalEntry: BuiltinLedgerJournalEntry): Promise<void> {
        const mongoJournalEntry: any = {
            id: builtinLedgerJournalEntry.id,
            currencyCode: builtinLedgerJournalEntry.currencyCode,
            currencyDecimals: builtinLedgerJournalEntry.currencyDecimals,
            pending: builtinLedgerJournalEntry.pending,
            amount: bigintToString(builtinLedgerJournalEntry.amount, builtinLedgerJournalEntry.currencyDecimals),
            debitedAccountId: builtinLedgerJournalEntry.debitedAccountId,
            creditedAccountId: builtinLedgerJournalEntry.creditedAccountId,
            timestamp: builtinLedgerJournalEntry.timestamp
        };

        try {
            await this._collection.insertOne(mongoJournalEntry);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }

    async getJournalEntriesByAccountId(accountId: string): Promise<BuiltinLedgerJournalEntry[]> {
        let journalEntries: any[];
        try {
            journalEntries = await this._collection.find(
                {$or: [{debitedAccountId: accountId}, {creditedAccountId: accountId}]}
            ).project({_id: 0}).toArray();
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        journalEntries.forEach((journalEntry) => {
            journalEntry.amount = stringToBigint(journalEntry.amount, journalEntry.currencyDecimals);
        });
        return journalEntries;
    }

    async reverseJournalEntry(journalEntryId: string): Promise<void>{
        try {
            const result = await this._collection.deleteOne({id: journalEntryId});
            if(result.deletedCount != 1) throw new Error("Could not reverseJournalEntry with Id: "+ journalEntryId);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }
}
