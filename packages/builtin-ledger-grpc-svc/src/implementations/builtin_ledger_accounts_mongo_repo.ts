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
import {CoaAccount} from "@mojaloop/accounts-and-balances-bc-coa-grpc-svc/dist/domain/coa_account";
import {Redis} from "ioredis";

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

declare type CacheItem = {
    account:BuiltinLedgerAccount, timestamp:number
}

export class BuiltinLedgerAccountsMongoRepo implements IBuiltinLedgerAccountsRepo {
    // Properties received through the constructor.
    private readonly _logger: ILogger;
    private readonly _url: string;
    // Other properties.
    private static readonly TIMEOUT_MS: number = 5_000;
    private static readonly DB_NAME: string = "accounts_and_balances_bc_builtin_ledger";
    private static readonly COLLECTION_NAME: string = "accounts";
    private static readonly DUPLICATE_KEY_ERROR_CODE: number = 11000;
    private _client: MongoClient;
    private _collection: Collection;
    private _redisClient: Redis;
    private readonly _keyPrefix= "builtinLedgerAccount_";

    constructor(
        logger: ILogger,
        mongoUrl: string,
        redisHost: string,
        redisPort: number
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._url = mongoUrl;
        this._redisClient = new Redis({
            port: redisPort,
            host: redisHost,
            lazyConnect: true
        });
    }

    async init(): Promise<void> {
        try {
            // TODO: investigate other types of timeouts; configure TLS.
            this._client = new MongoClient(this._url, {
                serverSelectionTimeoutMS: BuiltinLedgerAccountsMongoRepo.TIMEOUT_MS
            });
            await this._client.connect();

            const db: Db = this._client.db(BuiltinLedgerAccountsMongoRepo.DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray();
            const collectionExists: boolean = collections.some((collection) => {
                return collection.name === BuiltinLedgerAccountsMongoRepo.COLLECTION_NAME;
            });

            // collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
            // to be passed as an argument.
            if (collectionExists) {
                this._collection = db.collection(BuiltinLedgerAccountsMongoRepo.COLLECTION_NAME);
            }else{
                this._collection = await db.createCollection(BuiltinLedgerAccountsMongoRepo.COLLECTION_NAME, {
                    validator: {$jsonSchema: BUILTIN_LEDGER_ACCOUNT_MONGO_SCHEMA}
                });
                await this._collection.createIndex({"id": 1}, {unique: true});
            }
            this._logger.debug("Connected to Mongo successfully");
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        try{
            await this._redisClient.connect();
            this._logger.debug("Connected to Redis successfully");
        }catch(error: unknown){
            this._logger.error(`Unable to connect to redis cache: ${(error as Error).message}`);
            throw error;
        }
    }

    async destroy(): Promise<void> {
        await this._client.close();
    }

    private _getKeyWithPrefix (key: string): string {
        return this._keyPrefix + key;
    }

    private async _getFromCache(id:string):Promise<BuiltinLedgerAccount | null>{
        const objStr = await this._redisClient.get(this._getKeyWithPrefix(id));
        if(!objStr) return null;

        try{
            const obj = JSON.parse(objStr);

            // reconvert to bigints
            obj.postedDebitBalance = BigInt(obj.postedDebitBalance);
            obj.postedCreditBalance = BigInt(obj.postedCreditBalance);
            obj.pendingDebitBalance = BigInt(obj.pendingDebitBalance);
            obj.pendingCreditBalance = BigInt(obj.pendingCreditBalance);
            return obj;
        }catch (e) {
            this._logger.error(e);
            return null;
        }
    }

    private async _setToCache(account:BuiltinLedgerAccount):Promise<void>{
        const parsed:any = {...account};
        parsed.postedDebitBalance = parsed.postedDebitBalance.toString();
        parsed.postedCreditBalance = parsed.postedCreditBalance.toString();
        parsed.pendingDebitBalance = parsed.pendingDebitBalance.toString();
        parsed.pendingCreditBalance = parsed.pendingCreditBalance.toString();

        await this._redisClient.set(this._getKeyWithPrefix(account.id), JSON.stringify(parsed));
    }


    async storeNewAccount(builtinLedgerAccount: BuiltinLedgerAccount): Promise<void> {
        const mongoAccount: any = {
            id: builtinLedgerAccount.id,
            state: builtinLedgerAccount.state,
            type: builtinLedgerAccount.type,
            limitCheckMode: builtinLedgerAccount.limitCheckMode,
            currencyCode: builtinLedgerAccount.currencyCode,
            currencyDecimals: builtinLedgerAccount.currencyDecimals,
            postedDebitBalance: builtinLedgerAccount.postedDebitBalance.toString(),
            pendingDebitBalance: builtinLedgerAccount.pendingDebitBalance.toString(),
            postedCreditBalance: builtinLedgerAccount.postedCreditBalance.toString(),
            pendingCreditBalance: builtinLedgerAccount.pendingCreditBalance.toString(),
            timestampLastJournalEntry: builtinLedgerAccount.timestampLastJournalEntry
        };

        try {
            await this._setToCache(builtinLedgerAccount);
            await this._collection.insertOne(mongoAccount);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }

    async getAccountsByIds(ids: string[]): Promise<BuiltinLedgerAccount[]> {
        const accounts: BuiltinLedgerAccount[] = [];

        const notFoundIds:string[] = [];
        for(const id of ids){
            const found = await this._getFromCache(id);
            if(found){
                accounts.push(found);
            }else{
                notFoundIds.push(id);
            }
        }

        if(notFoundIds.length==0){
            return accounts;
        }

        try {
            const fetchedAccounts = await this._collection.find({id: {$in: ids}}).project({_id: 0}).toArray() as BuiltinLedgerAccount[];
            accounts.push(...fetchedAccounts);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        // convert strings to bigInts
        accounts.forEach((account) => {
            account.postedDebitBalance = BigInt(account.postedDebitBalance);
            account.pendingDebitBalance = BigInt(account.pendingDebitBalance);
            account.postedCreditBalance = BigInt(account.postedCreditBalance);
            account.pendingCreditBalance = BigInt(account.pendingCreditBalance);
        });

        for(const acc of accounts){
            await this._setToCache(acc);
        }
        return accounts;
    }

    async updateAccountDebitBalanceAndTimestamp(
        accountId: string,
        newBalance: bigint,
        pending: boolean,
        timestampLastJournalEntry: number
    ): Promise<void> {
        const acc = await this._getFromCache(accountId);

        if(acc) {
            acc.timestampLastJournalEntry = timestampLastJournalEntry;
            if(pending){
                acc.pendingDebitBalance = newBalance;
            }else{
                acc.postedDebitBalance = newBalance;
            }
            await this._setToCache(acc);
        }


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

            updateResult = await this._collection.updateOne({id: accountId}, updateObject);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        if (updateResult.modifiedCount !== 1) {
            const err = new Error("Could not updateAccountDebitBalanceAndTimestampById");
            this._logger.error(err);
            throw err;
        }
    }

    async updateAccountCreditBalanceAndTimestamp(
        accountId: string,
        newBalance: bigint,
        pending: boolean,
        timestampLastJournalEntry: number
    ): Promise<void> {
        const acc = await this._getFromCache(accountId);

        if(acc) {
            acc.timestampLastJournalEntry = timestampLastJournalEntry;
            if(pending){
                acc.pendingCreditBalance = newBalance;
            }else{
                acc.postedCreditBalance = newBalance;
            }
            await this._setToCache(acc);
        }

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

            updateResult = await this._collection.updateOne({id: accountId}, updateObject);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        if (updateResult.modifiedCount !== 1) {
            const err = new Error("Could not updateAccountCreditBalanceAndTimestampById");
            this._logger.error(err);
            throw err;
        }
    }

    async updateAccountStatesByIds(accountIds: string[], accountState: AccountsAndBalancesAccountState): Promise<void> {
        let updateResult: any;
        try {
            updateResult = await this._collection.updateMany(
                {id: {$in: accountIds}},
                {$set: {accountState: accountState}}
            );

            // don't bother the updates, just remove from cache
            const keys = accountIds.map(this._getKeyWithPrefix.bind(this));
            await this._redisClient.del(keys);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        if (updateResult.modifiedCount !== accountIds.length) {
            const err = new Error("Could not updateAccountStatesByIds");
            this._logger.error(err);
            throw err;
        }
    }

    async updateAccounts(accounts: BuiltinLedgerAccount[]): Promise<void>{
        const operations = accounts.map(value=>{
            return {
                replaceOne: {
                    "filter": {id: value.id},
                    "replacement": {
                        id: value.id,
                        state: value.state,
                        type: value.type,
                        limitCheckMode: value.limitCheckMode,
                        currencyCode: value.currencyCode,
                        currencyDecimals: value.currencyDecimals,
                        postedDebitBalance: value.postedDebitBalance.toString(),
                        pendingDebitBalance: value.pendingDebitBalance.toString(),
                        postedCreditBalance: value.postedCreditBalance.toString(),
                        pendingCreditBalance: value.pendingCreditBalance.toString(),
                        timestampLastJournalEntry: value.timestampLastJournalEntry
                    }
                }
            };
        });

        let updateResult: any;
        try {
            updateResult = await this._collection.bulkWrite(operations);

            if (updateResult.modifiedCount !== accounts.length) {
                const err = new Error("Could not updateAccountStatesByIds");
                this._logger.error(err);
                throw err;
            }

            // don't bother the updates, just remove from cache
            const keys = accounts.map(item => {return this._getKeyWithPrefix(item.id)});
            await this._redisClient.del(keys);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }


    }
}
