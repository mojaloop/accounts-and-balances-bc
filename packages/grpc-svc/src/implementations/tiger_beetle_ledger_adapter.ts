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

 --------------
 ******/


import {
    ILedgerAdapter,
    LedgerAdapterAccount, LedgerAdapterCreateResponseItem,
    LedgerAdapterJournalEntry,
    LedgerAdapterRequestId,
} from "../domain/infrastructure-types/ledger_adapter";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    AccountsAndBalancesAccountState,
    AccountsAndBalancesAccountType, IAccountsBalancesHighLevelRequest, IAccountsBalancesHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import * as TB from "tigerbeetle-node";
import {CreateAccountsError} from "tigerbeetle-node/src/bindings";
import {CreateTransfersError} from "tigerbeetle-node";
import net from "net";
import dns from "dns";
import {randomUUID} from "crypto";

export class TigerBeetleLedgerAdapter implements ILedgerAdapter {
    private readonly _logger: ILogger;
    private readonly _clusterId: number;
    private _replicaAddresses: string[];
    private _client: TB.Client;

    constructor(clusterId: number, replicaAddresses: string[], logger: ILogger) {
        this._clusterId = clusterId;
        this._replicaAddresses = replicaAddresses;
        this._logger = logger.createChild(this.constructor.name);
    }

    async init(): Promise<void> {
        this._logger.debug("Init starting..");

        await this._parseAndLookupReplicaAddresses();

        this._logger.info(`TigerBeetleAdapter.init() creating client instance to clusterId: ${this._clusterId} and replica addresses: ${this._replicaAddresses}...`);
        this._client = TB.createClient({
            cluster_id: this._clusterId,
            replica_addresses: this._replicaAddresses
        });
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
        createRequests: {
            requestedId: string,
            type: string,
            currencyCode: string
        }[]
    ): Promise<LedgerAdapterCreateResponseItem[]> {

        // Create request for TigerBeetle:
        const request: TB.Account[] = createRequests.map(item => {
            const coa = this._coaFrom(item.type);
            const currencyCode = this._currencyCodeFrom(item.currencyCode);
            return {
                id: this._uuidToBigint(item.requestedId), // u128
                debits_pending: 0n,  // u64
                debits_posted: 0n,  // u64
                credits_pending: 0n, // u64
                credits_posted: 0n, // u64
                user_data_128: 0n, // u128, opaque third-party identifier to link this account to an external entity.
                user_data_64: 0n,// u64
                user_data_32: 0,// u32
                reserved: 0, // [48]u8
                ledger: currencyCode,   // u32, ledger value
                code: coa, // u16, a chart of accounts code describing the type of account (e.g. clearing, settlement)
                flags: 0,  // u16
                timestamp: 0n, // u64, Reserved: This will be set by the server.
            };
        });

        // Invoke Client:
        try {
            const errors: CreateAccountsError[] = await this._client.createAccounts(request);
            if (errors.length) {
                throw new Error("Cannot create account - error code: "+errors[0].result);
            }
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        // Re-Map for Adapter:
        return request.map(item => {
            return {
                requestedId: this._bigIntToUuid(item.id),
                attributedId: this._bigIntToUuid(item.id)
            };
        });
    }

    async createJournalEntries(
        createRequests: {
            requestedId: string,
            amountStr: string,
            currencyCode: string,
            creditedAccountId: string,
            debitedAccountId: string,
            timestamp: number,
            ownerId: string,
            pending: boolean
        }[]
    ): Promise<string[]> {

        // Create request for TigerBeetle:
        const request: TB.Transfer[] = createRequests.map(item => {
            let flags= 0;
            if (item.pending) flags |= TB.TransferFlags.pending;

            const currencyCode = this._currencyCodeFrom(item.currencyCode);
            const coa = this._coaFrom("POSITION");//TODO we want to expand on this
            const id = item.requestedId || randomUUID();
            return {
                id: this._uuidToBigint(id), // u128
                // Double-entry accounting:
                debit_account_id: this._uuidToBigint(item.debitedAccountId),  // u128
                credit_account_id: this._uuidToBigint(item.creditedAccountId), // u128
                amount: BigInt(item.amountStr), // u64
                pending_id: 0n, // u128
                // Opaque third-party identifier to link this transfer to an external entity:
                user_data_128: this._uuidToBigint(item.ownerId), // u128
                user_data_64: 0n,
                user_data_32: 0,
                // Timeout applicable for a pending/2-phase transfer:
                timeout: 0, // u64, in nano-seconds.
                // Collection of accounts usually grouped by the currency:
                // You can't transfer money between accounts with different ledgers:
                ledger: currencyCode,  // u32, ledger for transfer (e.g. currency).
                // Chart of accounts code describing the reason for the transfer:
                code: coa,  // u16, (e.g. deposit, settlement)
                flags: flags, // u16
                timestamp: 0n, //u64, Reserved: This will be set by the server.
            };
        });

        // Invoke Client:
        const returnVal : string[] = [];
        try {
            const errors: CreateTransfersError[] = await this._client.createTransfers(request);
            if (errors.length) {
                throw new Error("Cannot create transfers - error code: "+errors[0].result);
            }
            request.forEach(itm => returnVal.push(this._bigIntToUuid(itm.id)));
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        // Re-Map for Adapter:
        return returnVal;
    }

    async getAccountsByIds(ledgerAccountIds: LedgerAdapterRequestId[]): Promise<LedgerAdapterAccount[]> {
        // Create request for TigerBeetle:
        const request: TB.AccountID[] = ledgerAccountIds.map(item => {
            return this._uuidToBigint(item.id);
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
                id: this._bigIntToUuid(item.id),
                state: "ACTIVE" as AccountsAndBalancesAccountState,
                type: this._coaTxtFrom(item.code) as AccountsAndBalancesAccountType,
                currencyCode: this._currencyCodeTxtFrom(item.ledger),
                currencyDecimals: null, // Only for when creating.
                postedDebitBalance: `${item.debits_posted}`,
                pendingDebitBalance: `${item.debits_pending}`,
                postedCreditBalance: `${item.credits_posted}`,
                pendingCreditBalance: `${item.credits_pending}`,
                timestampLastJournalEntry: Number(item.timestamp)
            };
        });
    }

    async getJournalEntriesByAccountId(ledgerAccountId: string): Promise<LedgerAdapterJournalEntry[]> {
        // Create request for TigerBeetle:
        const accIdTB = this._uuidToBigint(ledgerAccountId);

        // Invoke Client:
        const transfers: TB.Transfer[] = [];
        try {
            //TODO requires UserData lookup via (user_data)
            //TODO transfers = await this._client.lookupTransfers(request);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        return transfers.map(item => {
            return {
                id: this._bigIntToUuid(item.id),
                ownerId: this._bigIntToUuid(item.user_data_128),
                currencyCode: this._currencyCodeTxtFrom(item.ledger),
                currencyDecimals: null, // TODO: null?
                amount: `${item.amount}`,
                pending: false,
                debitedAccountId: this._bigIntToUuid(item.debit_account_id),
                creditedAccountId: this._bigIntToUuid(item.credit_account_id),
                timestamp: Number(item.timestamp)
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

    async processHighLevelBatch(requests:IAccountsBalancesHighLevelRequest[]):Promise<IAccountsBalancesHighLevelResponse[]>{
        try {
            // TODO later
            return [];
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }
    }

    // check if addresses are IPs or names, resolve if names
    private async _parseAndLookupReplicaAddresses():Promise<void>{
        console.table(this._replicaAddresses);

        const replicaIpAddresses:string[] = [];
        for (const addr of this._replicaAddresses) {
            this._logger.debug(`Parsing addr: ${addr}`);
            const parts = addr.split(":");
            if (!parts) {
                const err = new Error(`Cannot parse replicaAddresses in TigerBeetleAdapter.init() - value: "${addr}"`);
                this._logger.error(err.message);
                throw err;
            }
            this._logger.debug(`\t addr parts are: ${parts[0]} and ${parts[1]}`);

            if (net.isIP(parts[0]) === 0) {
                this._logger.debug("\t addr part[0] is not an IP address, looking it up..");
                await dns.promises.lookup(parts[0], {family:4}).then((resp) =>{
                    this._logger.debug(`\t lookup result is: ${resp.address}`);
                    replicaIpAddresses.push(`${resp.address}:${parts[1]}`);
                }).catch((error:Error)=>{
                    const err = new Error(`Lookup error while parsing replicaAddresses in TigerBeetleAdapter.init() - cannot resolve: "${addr[0]}" of "${addr}"`);
                    this._logger.error(err.message);
                    throw err;
                });
            } else {
                this._logger.debug("\t lookup not necessary, adding addr directly");
                replicaIpAddresses.push(addr);
            }
        }

        this._replicaAddresses = replicaIpAddresses;
        console.table(this._replicaAddresses);
    }

    // inspired from https://stackoverflow.com/a/53751162/5743904
    private _uuidToBigint(uuid:string): bigint {
        // let hex = uuid.replaceAll("-",""); // replaceAll only works on es2021
        let hex = uuid.replace(/-/g, "");
        if (hex.length % 2) hex = "0" + hex;
        const bi = BigInt("0x" + hex);
        return bi;
    }

    private _currencyCodeFrom(currencyTxt: string): number {
        let currencyCode = 0;
        switch (currencyTxt) {
            case "USD": currencyCode = 720; break;
            case "EUR": currencyCode = 978; break;
            case "ZAR": currencyCode = 710; break;
        }
        return currencyCode;
    }

    private _currencyCodeTxtFrom(currency: number): string {
        let currencyCode = "";
        switch (currency) {
            case 720: currencyCode = "USD"; break;
            case 978: currencyCode = "EUR"; break;
            case 710: currencyCode = "ZAR"; break;
        }
        return currencyCode;
    }

    private _coaFrom(type: string): number {
        let coa = 0;
        switch (type) {
            case "POSITION": coa = 1; break;
            case "SETTLEMENT": coa = 2; break;
        }
        return coa;
    }

    private _coaTxtFrom(type: number): string {
        let coa = "POSITION";
        switch (type) {
            case 1: coa = "POSITION"; break;
            case 2: coa = "SETTLEMENT"; break;
        }
        return coa;
    }

    private _bigIntToUuid(bi:bigint): string {
        let str = bi.toString(16);
        while (str.length<32) str = "0"+str;

        if (str.length !== 32){
            this._logger.warn(`_bigIntToUuid() got string that is not 32 chars long: "${str}"`);
        } else {
            str = str.substring(0, 8)+"-"+str.substring(8, 12)+"-"+str.substring(12, 16)+"-"+str.substring(16, 20)+"-"+str.substring(20);
        }

        return str;
    }
}
