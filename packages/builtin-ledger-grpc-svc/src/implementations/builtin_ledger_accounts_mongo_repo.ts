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
"use struct";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Collection, Db, MongoClient, UpdateResult} from "mongodb";
import {
    BuiltinLedgerAccount,
    IBuiltinLedgerAccountsRepo,
} from "../domain";
import {AccountsAndBalancesAccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export const BUILTIN_LEDGER_ACCOUNT_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Built-in Ledger Account Mongo Schema",
    required: [
        "_id",
        "id",
        "state",
        "type",
        "limitCheckMode",
        "currencyCode",
        "currencyDecimals",
        "postedDebitBalance",
        "pendingDebitBalance",
        "postedCreditBalance",
        "pendingCreditBalance",
        "timestampLastJournalEntry"
    ],
    properties: {
        _id: {"bsonType": "objectId"},
        id: {bsonType: "string"},
        state: {bsonType: "string"},
        type: {bsonType: "string"},
        limitCheckMode: {bsonType: "string"},
        currencyCode: {bsonType: "string"},
        currencyDecimals: {bsonType: "int"},
        postedDebitBalance: {bsonType: "string"},
        pendingDebitBalance: {bsonType: "string"},
        postedCreditBalance: {bsonType: "string"},
        pendingCreditBalance: {bsonType: "string"},
        timestampLastJournalEntry: {bsonType: ["number", "null"]},
    },
    additionalProperties: false
};

export class BuiltinLedgerAccountsMongoRepo implements IBuiltinLedgerAccountsRepo {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly URL: string;
    // Other properties.
    private static readonly TIMEOUT_MS: number = 5_000;
    private static readonly DB_NAME: string = "accounts_and_balances_bc_builtin_ledger";
    private static readonly COLLECTION_NAME: string = "accounts";
    private static readonly DUPLICATE_KEY_ERROR_CODE: number = 11000;
    private client: MongoClient;
    private collection: Collection;

    constructor(
        logger: ILogger,
        url: string
    ) {
        this.logger = logger.createChild(this.constructor.name);
        this.URL = url;
    }

    async init(): Promise<void> {
        try {
            // TODO: investigate other types of timeouts; configure TLS.
            this.client = new MongoClient(this.URL, {
                serverSelectionTimeoutMS: BuiltinLedgerAccountsMongoRepo.TIMEOUT_MS
            });
            await this.client.connect();

            const db: Db = this.client.db(BuiltinLedgerAccountsMongoRepo.DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray()
            const collectionExists: boolean = collections.some((collection) => {
                return collection.name === BuiltinLedgerAccountsMongoRepo.COLLECTION_NAME;
            });

            // collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
            // to be passed as an argument.
            if (collectionExists) {
                this.collection = db.collection(BuiltinLedgerAccountsMongoRepo.COLLECTION_NAME);
                return;
            }
            this.collection = await db.createCollection(BuiltinLedgerAccountsMongoRepo.COLLECTION_NAME, {
                validator: {$jsonSchema: BUILTIN_LEDGER_ACCOUNT_MONGO_SCHEMA}
            });
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }
    }

    async destroy(): Promise<void> {
        await this.client.close();
    }

    async storeNewAccount(builtinLedgerAccount: BuiltinLedgerAccount): Promise<void> {
        const mongoAccount: any = {
            id: builtinLedgerAccount.id,
            state: builtinLedgerAccount.state,
            type: builtinLedgerAccount.type,
            limitCheckMode: builtinLedgerAccount.limitCheckMode,
            currencyCode: builtinLedgerAccount.currencyCode,
            currencyDecimals: builtinLedgerAccount.currencyDecimals,
            debitBalance: builtinLedgerAccount.postedDebitBalance.toString(),
            creditBalance: builtinLedgerAccount.postedCreditBalance.toString(),
            timestampLastJournalEntry: builtinLedgerAccount.timestampLastJournalEntry
        };

        try {
            await this.collection.insertOne(mongoAccount);
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }
    }

    async getAccountsByIds(ids: string[]): Promise<BuiltinLedgerAccount[]> {
        let accounts: any[];
        try {
            accounts = await this.collection.find({id: {$in: ids}}).project({_id: 0}).toArray();
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        accounts.forEach((account) => {
            account.debitBalance = BigInt(account.debitBalance);
            account.creditBalance = BigInt(account.creditBalance);
        });
        return accounts;
    }

    async updateAccountDebitBalanceAndTimestamp(
        accountId: string,
        newBalance: bigint,
        pending: boolean,
        timestampLastJournalEntry: number
    ): Promise<void> {
        let updateResult: UpdateResult;
        try {
            const updateObject = {
                $set: {
                    timestampLastJournalEntry: timestampLastJournalEntry
                }
            };
            if(pending){
                (updateObject.$set as any).pendingDebitBalance = newBalance.toString();
            }else{
                (updateObject.$set as any).postedDebitBalance = newBalance.toString();
            }

            updateResult = await this.collection.updateOne({id: accountId}, updateObject);
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        if (updateResult.modifiedCount !== 1) {
            const err = new Error("Could not updateAccountDebitBalanceAndTimestampById");
            this.logger.error(err);
            throw err;
        }
    }

    async updateAccountCreditBalanceAndTimestamp(
        accountId: string,
        newBalance: bigint,
        pending: boolean,
        timestampLastJournalEntry: number
    ): Promise<void> {
        let updateResult: UpdateResult;
        try {
            const updateObject = {
                $set: {
                    timestampLastJournalEntry: timestampLastJournalEntry
                }
            };
            if (pending) {
                (updateObject.$set as any).pendingCreditBalance = newBalance.toString();
            } else {
                (updateObject.$set as any).postedCreditBalance = newBalance.toString();
            }

            updateResult = await this.collection.updateOne({id: accountId}, updateObject);
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        if (updateResult.modifiedCount !== 1) {
            const err = new Error("Could not updateAccountCreditBalanceAndTimestampById");
            this.logger.error(err);
            throw err;
        }
    }

    async updateAccountStatesByIds(accountIds: string[], accountState: AccountsAndBalancesAccountState): Promise<void> {
        let updateResult: any;
        try {
            updateResult = await this.collection.updateMany(
                {id: {$in: accountIds}},
                {$set: {accountState: accountState}}
            );
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        if (updateResult.modifiedCount !== accountIds.length) {
            const err = new Error("Could not updateAccountStatesByIds");
            this.logger.error(err);
            throw err;
        }
    }
}
