/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use struct";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Collection, Db, MongoClient, UpdateResult} from "mongodb";
import {
    BuiltinLedgerAccount,
    IBuiltinLedgerAccountsRepo,
} from "../domain";
import {AccountsAndBalancesAccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {Redis} from "ioredis";


declare type CacheItem = {
    account:BuiltinLedgerAccount, timestamp:number
}

export class RedisBuiltinLedgerAccountsRepo implements IBuiltinLedgerAccountsRepo {
    // Properties received through the constructor.
    private readonly _logger: ILogger;
    private readonly _keyPrefix= "builtinLedgerAccount_";
    private _redisClient: Redis;

    constructor(
        logger: ILogger,
        redisHost: string,
        redisPort: number
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._redisClient = new Redis({
            port: redisPort,
            host: redisHost,
            lazyConnect: true
        });
    }

    async init(): Promise<void> {
        try{
            await this._redisClient.connect();
        }catch(error: unknown){
            this._logger.error(`Unable to connect to redis cache: ${(error as Error).message}`);
            throw error;
        }
    }

    async destroy(): Promise<void> {
        return Promise.resolve();
    }

    private _getKeyWithPrefix (key: string): string {
        return this._keyPrefix + key;
    }

    private async _getFromCache(id:string):Promise<BuiltinLedgerAccount | null>{
        const objStr = await this._redisClient.get(this._getKeyWithPrefix(id));
        if(!objStr) return null;

        try{
            const obj = JSON.parse(objStr);
            return obj;
        }catch (e) {
            this._logger.error(e);
            return null;
        }
    }

    private async _setToCache(account:BuiltinLedgerAccount):Promise<void>{
        this._redisClient.set(this._getKeyWithPrefix(account.id), JSON.stringify(account));
    }


    async storeNewAccount(builtinLedgerAccount: BuiltinLedgerAccount): Promise<void> {
        try {
            await this._setToCache(builtinLedgerAccount);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }

    async getAccountsByIds(ids: string[]): Promise<BuiltinLedgerAccount[]> {
        const accounts: BuiltinLedgerAccount[] = [];

        for(const id of ids){
            const found = await this._getFromCache(id);
            if(found) accounts.push(found);
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
        }else{
            const err = new Error("Account not found in updateAccountDebitBalanceAndTimestamp");
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
        }else{
            const err = new Error("Account not found in updateAccountCreditBalanceAndTimestamp");
            this._logger.error(err);
            throw err;
        }

    }

    async updateAccountStatesByIds(accountIds: string[], accountState: AccountsAndBalancesAccountState): Promise<void> {
        throw new Error("Not implemented - updateAccountStatesByIds");
    }

    async updateAccounts(accounts: BuiltinLedgerAccount[]): Promise<void>{
        throw new Error("Not implemented - updateAccounts");
    }
}
