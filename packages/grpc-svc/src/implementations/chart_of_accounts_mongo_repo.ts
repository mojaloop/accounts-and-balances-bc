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

import {AccountsAndBalancesAccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import { IChartOfAccountsRepo } from "../domain/infrastructure-types/chart_of_accounts_repo";
import { CoaAccount } from "../domain/coa_account";
import {Redis} from "ioredis";

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
        ledgerAccountId: {bsonType: ["string", "null"]},
        ownerId: {bsonType: ["string", "null"]},
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
    private readonly logger: ILogger;
    private readonly URL: string;
    // Other properties.
    private static readonly TIMEOUT_MS: number = 5_000;
    private static readonly DB_NAME: string = "accounts_and_balances_bc_coa";
    private static readonly COLLECTION_NAME: string = "chart_of_accounts";
    private static readonly DUPLICATE_KEY_ERROR_CODE: number = 11000;
    private readonly keyPrefix= "coaAccount_";
    private client: MongoClient;
    private collection: Collection;
    private redisClient: Redis;

    constructor(
        logger: ILogger,
        mongoUrl: string,
        redisHost: string,
        redisPort: number
    ) {
        this.logger = logger.createChild(this.constructor.name);
        this.URL = mongoUrl;

        this.redisClient = new Redis({
            port: redisPort,
            host: redisHost,
            lazyConnect: true
        });
    }

    async init(): Promise<void> {
        try {
            // TODO: investigate other types of timeouts; configure TLS.
            this.client = new MongoClient(this.URL, {
                serverSelectionTimeoutMS: ChartOfAccountsMongoRepo.TIMEOUT_MS
            });
            await this.client.connect();

            const db: Db = this.client.db(ChartOfAccountsMongoRepo.DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray();
            const collectionExists: boolean = collections.some((collection) => {
                return collection.name === ChartOfAccountsMongoRepo.COLLECTION_NAME;
            });

            // collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
            // to be passed as an argument.
            if (collectionExists) {
                this.collection = db.collection(ChartOfAccountsMongoRepo.COLLECTION_NAME);
                return;
            }
            this.collection = await db.createCollection(ChartOfAccountsMongoRepo.COLLECTION_NAME, {
                validator: {$jsonSchema: COA_ACCOUNT_MONGO_SCHEMA}
            });
            await this.collection.createIndex({"id": 1}, {unique: true});
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        try{
            await this.redisClient.connect();
        }catch(error: unknown){
            this.logger.error(`Unable to connect to redis cache: ${(error as Error).message}`);
            throw error;
        }
    }

    async destroy(): Promise<void> {
        await this.client.close();
        await this.redisClient.quit();
    }

    private _getKeyWithPrefix (key: string): string {
        return this.keyPrefix + key;
    }

    private async _getAccountFromCache(id:string):Promise<CoaAccount | null>{
        const accStr = await this.redisClient.get(this._getKeyWithPrefix(id));
        if(!accStr) return null;

        try{
            const acc = JSON.parse(accStr);
            return acc;
        }catch (e) {
            this.logger.error(e);
            return null;
        }
    }

    private async _setCacheAccount(account:CoaAccount):Promise<void>{
        this.redisClient.set(this._getKeyWithPrefix(account.id), JSON.stringify(account));
    }

    async accountsExistByInternalIds(internalIds: string[]): Promise<boolean> {
        let accounts: any[];
        try {
            accounts = await this.collection.find({id: {$in: internalIds}}).toArray();
        } catch (error: unknown) {
            this.logger.error(error);
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
            await this.collection.insertMany(coaAccounts);
        } catch (error: unknown) {
            this.logger.error(error);
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
            const fetchedAccounts = await this.collection.find({id: {$in: notFoundIds}}).project({_id: 0}).toArray() as CoaAccount[];
            for(const acc of fetchedAccounts){
                await this._setCacheAccount(acc);
            }

            accounts.push(...fetchedAccounts);
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        return accounts;
    }

    async getAccountsByOwnerId(ownerId: string): Promise<CoaAccount[]> {
        let accounts: any[];
        try {
            accounts = await this.collection.find({ownerId: ownerId}).project({_id: 0}).toArray();
            for(const acc of accounts){
                await this._setCacheAccount(acc);
            }
        } catch (error: unknown) {
            this.logger.error(error);
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
