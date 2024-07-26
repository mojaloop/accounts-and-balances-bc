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

 * ILF
 - Jason Bruwer <jason.bruwer@coil.com>
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/
"use strict";

import {
    ILedgerAdapter,
    ILedgerAdapterCreateAccountRequestItem,
    ILedgerAdapterCreateAccountResponseItem,
    ILedgerAdapterGetAccountRequestItem, ILedgerAdapterGetAccountResponseItem,

} from "../domain/infrastructure-types/ledger_adapter";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    AnbAccountState,
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import * as TB from "tigerbeetle-node";
import {CreateAccountsError} from "tigerbeetle-node/src/bindings";
import {Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {TigerBeetleUtils} from "@mojaloop/accounts-and-balances-bc-client-lib";


export class TigerBeetleLedgerAdapter implements ILedgerAdapter {
    private readonly _logger: ILogger;
    private readonly _clusterId: number;
    private readonly _currencyList:Currency[];
    private _replicaAddresses: string[];
    private _client: TB.Client;

    constructor(clusterId: number, replicaAddresses: string[], currencyList:Currency[], logger: ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._clusterId = clusterId;
        this._replicaAddresses = replicaAddresses;
        this._currencyList = currencyList;
    }

    async init(): Promise<void> {
        this._logger.debug("Init starting..");

        this._replicaAddresses = await TigerBeetleUtils.parseAndLookupReplicaAddresses(this._replicaAddresses, this._logger);

        this._logger.info(`TigerBeetleAdapter.init() creating client instance to clusterId: ${this._clusterId} and replica addresses: ${this._replicaAddresses}...`);
        this._client = TB.createClient({
            cluster_id: BigInt(this._clusterId),
            replica_addresses: this._replicaAddresses
        });

        // simple connectivity test
        await this._client.lookupAccounts([0n]);
    }


    async destroy(): Promise<void> {
        // do nothing.
    }

    setToken(accessToken: string): void {
        // do nothing.
    }

    setUserCredentials(client_id: string, username: string, password: string): void {
        // do nothing.
    }

    setAppCredentials(client_id: string, client_secret: string): void {
        // do nothing.
    }

    async createAccounts(
        createRequests:ILedgerAdapterCreateAccountRequestItem[]
    ): Promise<ILedgerAdapterCreateAccountResponseItem[]> {
        // Create request for TigerBeetle:
        const request: TB.Account[] = createRequests.map(item => {
            const coa = TigerBeetleUtils.coaNumFromAccountType(item.accountType);
            const ledger = TigerBeetleUtils.ledgerNumFromCurrencyCode(item.currencyCode, this._currencyList);
            let flags = TB.AccountFlags.none;

            // TODO add ownerId to user_data_128 guarding that it converts to bigint

            if(item.accountType === "TIGERBEETLE_CONTROL"){
                flags |= TB.AccountFlags.debits_must_not_exceed_credits;
            }

            const id = TigerBeetleUtils.uuidToBigint(item.requestedId);
            this._logger.debug(`Creating account with request ext id: ${item.requestedId} and TB id: ${id}`);

            return {
                id: id, // u128
                debits_pending: 0n,  // u64
                debits_posted: 0n,  // u64
                credits_pending: 0n, // u64
                credits_posted: 0n, // u64
                user_data_128: 0n, // u128, opaque third-party identifier to link this account to an external entity.
                user_data_64: 0n,// u64
                user_data_32: 0,// u32
                reserved: 0, // [48]u8
                ledger: ledger,   // u32, ledger value
                code: coa, // u16, a chart of accounts code describing the type of account (e.g. clearing, settlement)
                flags: flags,  // u16
                timestamp: 0n, // u64, Reserved: This will be set by the server.
            };
        });

        // Invoke Client:
        try {
            const errors: CreateAccountsError[] = await this._client.createAccounts(request);
            if (errors.length) {
                throw new Error("Cannot create account - error code: "+errors[0].result);
            }
            this._logger.debug(`Created ${request.length} TB accounts successfully`);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        // Re-Map for Adapter:
        return request.map(item => {
            return {
                requestedId: TigerBeetleUtils.bigIntToUuid(item.id),
                attributedId: TigerBeetleUtils.bigIntToUuid(item.id)
            };
        });
    }

    async getAccountsByIds(ledgerAccountIds: ILedgerAdapterGetAccountRequestItem[]): Promise<ILedgerAdapterGetAccountResponseItem[]> {
        // Create request for TigerBeetle:
        const request: TB.AccountID[] = ledgerAccountIds.map(item => {
            return TigerBeetleUtils.uuidToBigint(item.id);
        });

        // Invoke Client:
        let accounts: TB.Account[] = [];
        try {
            accounts = await this._client.lookupAccounts(request);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        return accounts.map(item => {
            return {
                id: TigerBeetleUtils.bigIntToUuid(item.id),
                // all accounts are considered active, the CoA caller will remap if necessary
                state: "ACTIVE" as AnbAccountState,
                type: TigerBeetleUtils.accountTypeFromCoaCode(item.code),
                currencyCode: TigerBeetleUtils.currencyCodeFromLedgerNum(item.ledger, this._currencyList),
                currencyDecimals: null, // Only for when creating.
                postedDebitBalance: `${item.debits_posted}`,
                pendingDebitBalance: `${item.debits_pending}`,
                postedCreditBalance: `${item.credits_posted}`,
                pendingCreditBalance: `${item.credits_pending}`,
                timestampLastJournalEntry: Number(item.timestamp)
            };
        });
    }

    async deleteAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
        // TODO later
    }

    async deactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
        // TODO later
    }

    async reactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
        // TODO later
    }

}
