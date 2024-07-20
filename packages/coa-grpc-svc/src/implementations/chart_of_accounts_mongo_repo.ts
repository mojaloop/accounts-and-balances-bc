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
    AnbAccountType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import { IChartOfAccountsRepo } from "../domain/infrastructure-types/chart_of_accounts_repo";
import { CoaAccount } from "../domain/coa_account";
import {Redis} from "ioredis";

const TIMEOUT_MS: number = 5_000;
const DB_NAME: string = "accounts_and_balances_bc_coa";
const COLLECTION_NAME: string = "chart_of_accounts";
const DUPLICATE_KEY_ERROR_CODE: number = 11000;

export const COA_ACCOUNT_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Chart of Account's Account Mongo Schema",
    required: [
        "_id", // internalId.
        "id",
        "ledgerAccountId",
        "ownerId",
        "state",
        "type",
        "currencyCode",
        "currencyDecimals"
    ],
    properties: {
        _id: {bsonType: "objectId"},
        id: {bsonType: "string"},
        ledgerAccountId: {bsonType: "string"},
        ownerId: {bsonType: "string"},
        state: {bsonType: "string"},
        type: {bsonType: "string"},
        currencyCode: {bsonType: "string"},
        currencyDecimals: {bsonType: "int"}
    },
    additionalProperties: false
};

declare type CacheItem = {
    account:CoaAccount, timestamp:number
}

export class ChartOfAccountsMongoRepo implements IChartOfAccountsRepo {
    // Properties received through the constructor.
    private readonly _logger: ILogger;
    private readonly _mongoUrl: string;
    // Other properties.

    private readonly _keyPrefix= "coaAccount_";
    private _client: MongoClient;
    private _collection: Collection;
    private _redisClient: Redis;

    constructor(
        logger: ILogger,
        mongoUrl: string,
        redisHost: string,
        redisPort: number
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._mongoUrl = mongoUrl;

        this._redisClient = new Redis({
            port: redisPort,
            host: redisHost,
            lazyConnect: true
        });
    }

    async init(): Promise<void> {
        try {
            // TODO: investigate other types of timeouts; configure TLS.
            this._client = new MongoClient(this._mongoUrl, {
                serverSelectionTimeoutMS: TIMEOUT_MS
            });
            await this._client.connect();

            const db: Db = this._client.db(DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray();
            const collectionExists: boolean = collections.some((collection) => {
                return collection.name === COLLECTION_NAME;
            });

            // collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
            // to be passed as an argument.
            if (collectionExists) {
                this._collection = db.collection(COLLECTION_NAME);
            }else{
                this._collection = await db.createCollection(COLLECTION_NAME, {
                    validator: {$jsonSchema: COA_ACCOUNT_MONGO_SCHEMA}
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
        await this._redisClient.quit();
    }

    private _getKeyWithPrefix (key: string): string {
        return this._keyPrefix + key;
    }

    private async _getAccountFromCache(id:string):Promise<CoaAccount | null>{
        const accStr = await this._redisClient.get(this._getKeyWithPrefix(id));
        if(!accStr) return null;

        try{
            const acc = JSON.parse(accStr);
            return acc;
        }catch (e) {
            this._logger.error(e);
            return null;
        }
    }

    private async _setCacheAccount(account:CoaAccount):Promise<void>{
        await this._redisClient.set(this._getKeyWithPrefix(account.id), JSON.stringify(account));
    }

    async accountsExistByInternalIds(internalIds: string[]): Promise<boolean> {
        let accounts: any[];
        try {
            accounts = await this._collection.find({id: {$in: internalIds}}).toArray();
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
        const accountsExist = accounts.length === internalIds.length;
        return accountsExist;
    }

    async storeAccounts(coaAccounts: CoaAccount[]): Promise<void> {
        try {
            for(const acc of coaAccounts){
                await this._setCacheAccount(acc);
            }
            await this._collection.insertMany(coaAccounts);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }

    async getAccounts(ids: string[]): Promise<CoaAccount[]> {
        const accounts: CoaAccount[] = [];

        const notFoundIds:string[] = [];
        for(const id of ids){
            const found = await this._getAccountFromCache(id);
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
            const fetchedAccounts = await this._collection.find({id: {$in: notFoundIds}}).project({_id: 0}).toArray() as CoaAccount[];
            for(const acc of fetchedAccounts){
                await this._setCacheAccount(acc);
            }

            accounts.push(...fetchedAccounts);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        return accounts;
    }

    async getAccountsByOwnerId(ownerId: string): Promise<CoaAccount[]> {
        let accounts: any[];
        try {
            accounts = await this._collection.find({ownerId: ownerId}).project({_id: 0}).toArray();
            for(const acc of accounts){
                await this._setCacheAccount(acc);
            }
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        return accounts;
    }

    // TODO add cache
    async getAccountsByTypes(types:AnbAccountType[]): Promise<CoaAccount[]> {
        let accounts: any[];
        try {
            accounts = await this._collection.find({type: {$in: types}}).project({_id: 0}).toArray();
            for(const acc of accounts){
                await this._setCacheAccount(acc);
            }
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        return accounts;
    }



    /*async updateAccountStatesByInternalIds(accountIds: string[], accountState: AccountsAndBalancesAccountState): Promise<void> {
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

        if (updateResult.modifiedCount !==accountIds.length) {
            const err = new Error("Could not updateAccountStatesByInternalIds");
            this.logger.error(err);
            throw err;
        }
    }*/
}
