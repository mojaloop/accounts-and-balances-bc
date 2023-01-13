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
import {Collection, Db, MongoClient, MongoServerError, UpdateResult} from "mongodb";
import {
    BLAccountAlreadyExistsError,
    BLAccountNotFoundError,
    BuiltinLedgerAccount,
    IBuiltinLedgerAccountsRepo,
    BLUnableToGetAccountsError,
    BLUnableToInitRepoError,
    BLUnableToStoreAccountError,
    BLUnableToUpdateAccountError,
    BLUnableToUpdateAccountsError
} from "../domain";
import {AccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export const BUILTIN_LEDGER_ACCOUNT_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Built-in Ledger Account Mongo Schema",
    required: [
        "_id", // id.
        "state",
        "type",
        "limitCheckMode",
        "currencyCode",
        "currencyDecimals",
        "debitBalance",
        "creditBalance",
        "timestampLastJournalEntry"
    ],
    properties: {
        // TODO:
        //  bsonType vs type;
        //  long and binData BSON types;
        //  check if _id can be replaced.
        _id: {bsonType: "string"},
        state: {bsonType: "string"},
        type: {bsonType: "string"},
        limitCheckMode: {bsonType: "string"},
        currencyCode: {bsonType: "string"},
        currencyDecimals: {bsonType: "int"},
        debitBalance: {bsonType: "string"},
        creditBalance: {bsonType: "string"},
        timestampLastJournalEntry: {bsonType: ["number", "null"]}, // TODO: long instead of number?
    },
    additionalProperties: false
};

export class BuiltinLedgerAccountsMongoRepo implements IBuiltinLedgerAccountsRepo {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly URL: string; // TODO: store the username and password here?
    // Other properties.
    private static readonly TIMEOUT_MS: number = 5_000;
    private static readonly DB_NAME: string = "accounts_and_balances_bc";
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
            const collections: any[] = await db.listCollections().toArray(); // TODO: verify type.
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
            throw new BLUnableToInitRepoError((error as any)?.message);
        }
    }

    async destroy(): Promise<void> {
        await this.client.close();
    }

    async storeNewAccount(builtinLedgerAccount: BuiltinLedgerAccount): Promise<void> {
        // Convert BuiltinLedgerAccount's id to Mongo's _id.
        // TODO: is this the best way to do it?
        const mongoAccount: any = { // TODO: verify type.
            _id: builtinLedgerAccount.id,
            state: builtinLedgerAccount.state,
            type: builtinLedgerAccount.type,
            limitCheckMode: builtinLedgerAccount.limitCheckMode,
            currencyCode: builtinLedgerAccount.currencyCode,
            currencyDecimals: builtinLedgerAccount.currencyDecimals,
            debitBalance: builtinLedgerAccount.debitBalance.toString(), // TODO: create an auxiliary variable?
            creditBalance: builtinLedgerAccount.creditBalance.toString(), // TODO: create an auxiliary variable?
            timestampLastJournalEntry: builtinLedgerAccount.timestampLastJournalEntry
        };

        try {
            await this.collection.insertOne(mongoAccount);
        } catch (error: unknown) {
            if (
                error instanceof MongoServerError
                && error.code === BuiltinLedgerAccountsMongoRepo.DUPLICATE_KEY_ERROR_CODE
            ) { // TODO: should this be done?
                throw new BLAccountAlreadyExistsError();
            }
            throw new BLUnableToStoreAccountError((error as any)?.message);
        }
    }

    async getAccountsByIds(ids: string[]): Promise<BuiltinLedgerAccount[]> {
        let accounts: any[]; // TODO: verify type.
        try {
            accounts = await this.collection.find({_id: {$in: ids}}).toArray(); // TODO: verify filter; is there a simpler way to find by _id?
        } catch (error: unknown) {
            throw new BLUnableToGetAccountsError((error as any)?.message);
        }

        // Convert Mongo's _id to BuiltinLedgerAccount's id.
        // TODO: is this the best way to do it? will id be placed at the end of account?
        accounts.forEach((account) => {
            account.id = account._id;
            delete account._id;

            account.debitBalance = BigInt(account.debitBalance); // TODO: create an auxiliary variable?
            account.creditBalance = BigInt(account.creditBalance); // TODO: create an auxiliary variable?
        });
        return accounts;
    }

    async updateAccountDebitBalanceAndTimestampById(
        accountId: string,
        debitBalance: bigint,
        timestampLastJournalEntry: number
    ): Promise<void> {
        let updateResult: UpdateResult;
        try {
            updateResult = await this.collection.updateOne(
                {_id: accountId},
                {$set: {debitBalance: debitBalance.toString(), timestampLastJournalEntry: timestampLastJournalEntry}}
            );
        } catch (error: unknown) {
            throw new BLUnableToUpdateAccountError((error as any)?.message);
        }

        if (updateResult.modifiedCount === 0) { // TODO: use "!updateResult.modifiedCount" instead?
            throw new BLAccountNotFoundError();
        }
    }

    async updateAccountCreditBalanceAndTimestampById(
        accountId: string,
        creditBalance: bigint,
        timestampLastJournalEntry: number
    ): Promise<void> {
        let updateResult: UpdateResult;
        try {
            updateResult = await this.collection.updateOne(
                {_id: accountId},
                {$set: {creditBalance: creditBalance.toString(), timestampLastJournalEntry: timestampLastJournalEntry}}
            );
        } catch (error: unknown) {
            throw new BLUnableToUpdateAccountError((error as any)?.message);
        }

        if (updateResult.modifiedCount === 0) { // TODO: use "!updateResult.modifiedCount" instead?
            throw new BLAccountNotFoundError();
        }
    }

    async updateAccountStatesByIds(accountIds: string[], accountState: AccountState): Promise<void> {
        let updateResult: any; // TODO: verify type.
        try {
            updateResult = await this.collection.updateMany(
                {_id: {$in: accountIds}},
                {$set: {accountState: accountState}}
            );
        } catch (error: unknown) {
            throw new BLUnableToUpdateAccountsError((error as any)?.message);
        }

        if (updateResult.modifiedCount === 0) { // TODO: use "!updateResult.modifiedCount" instead?
            throw new BLAccountNotFoundError();
        }
    }
}
