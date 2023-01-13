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

import {IChartOfAccountsRepo} from "../domain/infrastructure-types/chart_of_accounts_repo";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Collection, Db, MongoClient, MongoServerError, UpdateResult} from "mongodb";
import {
    AccountAlreadyExistsError,
    AccountNotFoundError,
    CoaAccount,
    UnableToGetAccountsError,
    UnableToInitRepoError,
    UnableToStoreAccountsError,
    UnableToUpdateAccountsError
} from "../domain";
import {AccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export const COA_ACCOUNT_MONGO_SCHEMA: any = {
    bsonType: "object",
    title: "Chart of Account's Account Mongo Schema",
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

export class ChartOfAccountsMongoRepo implements IChartOfAccountsRepo {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly URL: string; // TODO: store the username and password here?
    // Other properties.
    private static readonly TIMEOUT_MS: number = 5_000;
    private static readonly DB_NAME: string = "accounts_and_balances_bc";
    private static readonly COLLECTION_NAME: string = "chart_of_accounts";
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
                serverSelectionTimeoutMS: ChartOfAccountsMongoRepo.TIMEOUT_MS
            });
            await this.client.connect();

            const db: Db = this.client.db(ChartOfAccountsMongoRepo.DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray(); // TODO: verify type.
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
        } catch (error: unknown) {
            throw new UnableToInitRepoError((error as any)?.message);
        }
    }

    async destroy(): Promise<void> {
        await this.client.close();
    }

    // TODO: handle case in which the array received is empty (currently, true is returned).
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

    async updateAccountStatesByInternalIds(accountIds: string[], accountState: AccountState): Promise<void> {
        let updateResult: any; // TODO: verify type.
        try {
            updateResult = await this.collection.updateMany(
                {_id: {$in: accountIds}},
                {$set: {accountState: accountState}}
            );
        } catch (error: unknown) {
            throw new UnableToUpdateAccountsError((error as any)?.message);
        }

        if (updateResult.modifiedCount === 0) { // TODO: use "!updateResult.modifiedCount" instead?
            throw new AccountNotFoundError();
        }
    }
}
