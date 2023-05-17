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

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/

import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import {
    ILedgerAdapter,
    LedgerAdapterAccount, LedgerAdapterCreateResponseItem,
    LedgerAdapterJournalEntry,
    LedgerAdapterRequestId,
} from "../domain/infrastructure-types/ledger_adapter";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    BuiltinLedgerGrpcAccountArray__Output,
    BuiltinLedgerGrpcClient,
    BuiltinLedgerGrpcCreateAccountArray,
    BuiltinLedgerGrpcCreateIdsResponse__Output,
    BuiltinLedgerGrpcCreateJournalEntryArray,
    BuiltinLedgerGrpcId,
    BuiltinLedgerGrpcJournalEntryArray__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {AccountsAndBalancesAccountState, AccountsAndBalancesAccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import * as TB from "tigerbeetle-node";
import net from "net";
import dns from "dns";
import {CreateAccountsError} from "tigerbeetle-node/src/bindings";

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

        this._logger.info(`TigerBeetleAdapter.init() creating client instance to clusterId: ${this._clusterId} and replica addresses: ${this._replicaAddresses}...`)
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

    async createAccounts(createRequests: {requestedId: string, type: string, currencyCode: string }[]): Promise<LedgerAdapterCreateResponseItem[]> {
        const request: TB.Account[] = createRequests.map(item => {
                let coa= 0;
                switch (item.type) {
                    case "POSITION":
                        coa = 1;
                    break;
                        //TODO need to add the rest.
                }
                let currencyCode = 0;
                switch (item.currencyCode) {
                    case "USD":
                        currencyCode = 720;
                    break;
                }

                return {
                    id: this._uuidToBigint(item.requestedId), // u128
                    user_data: 0n, // u128, opaque third-party identifier to link this account to an external entity:
                    reserved: Buffer.alloc(48, 0), // [48]u8
                    ledger: currencyCode,   // u32, ledger value
                    code: coa, // u16, a chart of accounts code describing the type of account (e.g. clearing, settlement)
                    flags: 0,  // u16
                    debits_pending: 0n,  // u64
                    debits_posted: 0n,  // u64
                    credits_pending: 0n, // u64
                    credits_posted: 0n, // u64
                    timestamp: 0n, // u64, Reserved: This will be set by the server.
                };
            });

        try {
            const errors: CreateAccountsError[] = await this._client.createAccounts(request);
            if (errors.length) {
                throw new Error("Cannot create account - error code: "+errors[0].result);
            }
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        return request.map(item => {
            return {
                requestedId: this._bigIntToUuid(item.id),
                attributedId: this._bigIntToUuid(item.id)
            };
        })
    }

    async createJournalEntries(
        createRequests: {
            requestedId: string, amountStr: string, currencyCode: string,
            creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
        }[]
    ): Promise<LedgerAdapterCreateResponseItem[]> {
        let createIdsResp: BuiltinLedgerGrpcCreateIdsResponse__Output;

        const grpcRequest: BuiltinLedgerGrpcCreateJournalEntryArray = {
            entriesToCreate: createRequests.map(item=>{
                return {
                    requestedId: item.requestedId,
                    ownerId: item.ownerId,
                    pending: item.pending,
                    currencyCode: item.currencyCode,
                    amount: item.amountStr,
                    debitedAccountId: item.debitedAccountId,
                    creditedAccountId: item.creditedAccountId
                };
            })
        };

        try {
            createIdsResp = await this._builtinLedgerClient.createJournalEntries(grpcRequest);
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        if (!createIdsResp.ids) {
            throw new Error();
        }

        return createIdsResp.ids as LedgerAdapterCreateResponseItem[];
    }


    async getAccountsByIds(ledgerAccountIds: LedgerAdapterRequestId[]): Promise<LedgerAdapterAccount[]> {
        const ids: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
            return {builtinLedgerGrpcId: ledgerAccountId.id};
        });

        let builtinLedgerGrpcAccountArrayOutput: BuiltinLedgerGrpcAccountArray__Output;
        try {
            builtinLedgerGrpcAccountArrayOutput
                = await this._builtinLedgerClient.getAccountsByIds({builtinLedgerGrpcIdArray: ids});
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        if (!builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray) {
            throw new Error();
        }

        const ledgerAdapterAccounts: LedgerAdapterAccount[]
            = builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray
            .map((builtinLedgerGrpcAccountOutput) => {
                const ledgerAdapterAccount: LedgerAdapterAccount = {
                    id: builtinLedgerGrpcAccountOutput.id ?? null, // TODO: ?? or ||?
                    state: builtinLedgerGrpcAccountOutput.state as AccountsAndBalancesAccountState,
                    type: builtinLedgerGrpcAccountOutput.type as AccountsAndBalancesAccountType,
                    currencyCode: builtinLedgerGrpcAccountOutput.currencyCode!,
                    currencyDecimals: null,
                    postedDebitBalance: builtinLedgerGrpcAccountOutput.postedDebitBalance!,
                    pendingDebitBalance: builtinLedgerGrpcAccountOutput.pendingDebitBalance!,
                    postedCreditBalance: builtinLedgerGrpcAccountOutput.postedCreditBalance!,
                    pendingCreditBalance: builtinLedgerGrpcAccountOutput.pendingCreditBalance!,
                    timestampLastJournalEntry: builtinLedgerGrpcAccountOutput.timestampLastJournalEntry ?? null // TODO: ?? or ||?
                };
                return ledgerAdapterAccount;
            });
        return ledgerAdapterAccounts;
    }

    // TODO: currency decimals ignored here, right?
    async getJournalEntriesByAccountId(
        ledgerAccountId: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        currencyDecimals: number
    ): Promise<LedgerAdapterJournalEntry[]> {
        let builtinLedgerGrpcJournalEntryArrayOutput: BuiltinLedgerGrpcJournalEntryArray__Output;
        try {
            builtinLedgerGrpcJournalEntryArrayOutput
                = await this._builtinLedgerClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: ledgerAccountId});
        } catch (error: unknown) {
            this._logger.error(error);
            throw error;
        }

        if (!builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray) {
            throw new Error();
        }

        const ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[] =
            builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray
                .map((builtinLedgerGrpcJournalEntryOutput) => {
                    if (
                        !builtinLedgerGrpcJournalEntryOutput.currencyCode
                        || !builtinLedgerGrpcJournalEntryOutput.amount
                        || !builtinLedgerGrpcJournalEntryOutput.debitedAccountId
                        || !builtinLedgerGrpcJournalEntryOutput.creditedAccountId
                    ) {
                        throw new Error(); // TODO: create custom error.
                    }

                    const ledgerAdapterJournalEntry: LedgerAdapterJournalEntry = {
                        id: builtinLedgerGrpcJournalEntryOutput.id ?? null, // TODO: ?? or ||?
                        ownerId: builtinLedgerGrpcJournalEntryOutput.ownerId ?? null,
                        currencyCode: builtinLedgerGrpcJournalEntryOutput.currencyCode,
                        currencyDecimals: null, // TODO: null?
                        amount: builtinLedgerGrpcJournalEntryOutput.amount,
                        pending: builtinLedgerGrpcJournalEntryOutput.pending!,
                        debitedAccountId: builtinLedgerGrpcJournalEntryOutput.debitedAccountId,
                        creditedAccountId: builtinLedgerGrpcJournalEntryOutput.creditedAccountId,
                        timestamp: builtinLedgerGrpcJournalEntryOutput.timestamp ?? null // TODO: ?? or ||?
                    };
                    return ledgerAdapterJournalEntry;
                });

        return ledgerAdapterJournalEntries;
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
                this._logger.debug(`\t addr part[0] is not an IP address, looking it up..`);
                await dns.promises.lookup(parts[0], {family:4}).then((resp) =>{
                    this._logger.debug(`\t lookup result is: ${resp.address}`);
                    replicaIpAddresses.push(`${resp.address}:${parts[1]}`);
                }).catch((error:Error)=>{
                    const err = new Error(`Lookup error while parsing replicaAddresses in TigerBeetleAdapter.init() - cannot resolve: "${addr[0]}" of "${addr}"`);
                    this._logger.error(err.message);
                    throw err;
                });
            } else {
                this._logger.debug(`\t lookup not necessary, adding addr directly`);
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
        if (hex.length % 2) { hex = "0" + hex; }
        const bi = BigInt("0x" + hex);
        return bi;
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
