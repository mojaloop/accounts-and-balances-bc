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

 * Interledger Foundation
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/

"use strict";

import {
    AnbAccountState, AnbAccountType,
    IAnbAccount, IAnbCreateAccountRequest, IAnbCreateJournalEntryRequest, IAnbCreateResponse,
    IAnbHighLevelRequest, IAnbHighLevelResponse, IAnbJournalEntry
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {
    GrpcControlPlane_CoaAccount
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_CoaAccount";

//
// export interface IControlPlaneManagementClient {
//     init(): Promise<void>;
//     isReady():boolean;
//
//     // returns array of account ids on success
//     createAccounts(accountCreates: IAnbCreateAccountRequest[]): Promise<IAnbCreateResponse[]>;
//
//     // deleteAccountsByIds(accountIds: string[]): Promise<void>;
//     // deactivateAccountsByIds(accountIds: string[]): Promise<void>;
//     // activateAccountsByIds(accountIds: string[]	): Promise<void>;
// }

export interface ILedgerDataPlaneClient {
    init(): Promise<void>;
    isReady():Promise<boolean>;
    destroy():Promise<void>;

    processHighLevelBatch(requests:IAnbHighLevelRequest[], accessToken?:string): Promise<IAnbHighLevelResponse[]>;

    // returns array of entry ids on success
    createJournalEntries(entryCreates: IAnbCreateJournalEntryRequest[], accessToken?:string): Promise<IAnbCreateResponse[]>;

    // returns array of accounts with balances
    //TODO should be a get Balance and return a simpler struct with only balance fields
    getAccountsByIds(accountIds: string[], accessToken?:string): Promise<ILedgerAccount[]>;
    getAccountsByOwnerIds(ownerIds: string[], accessToken?:string): Promise<ILedgerAccount[]>;

    getJournalEntriesByAccountId(accountId: string, accessToken?:string): Promise<IAnbJournalEntry[]>;
    getJournalEntriesByOwnerId(ownerId: string, accessToken?:string): Promise<IAnbJournalEntry[]>;
}

// should match GrpcControlPlane_CoaAccount  (override types to remove undefined and put enum types)
export interface ICoaAccount extends GrpcControlPlane_CoaAccount{
    id: string;
    ledgerAccountId: string;
    ownerId: string;
    state: AnbAccountState;
    type: AnbAccountType;
    currencyCode: string;
    currencyDecimals: number;
}


// Represents a ledger account, which is mostly about balances, other metadata is kept in the CoA
export interface ILedgerAccount {
    id: string;                                     // account id in accounts and balances (not the possibly different external ledger account id)
    //ownerId: string | null;                         // optional owner id
    // state: AnbAccountState;
    // type: AnbAccountType;
    currencyCode: string;                           // 3 letter (alphabetic) iso 4217 code // TODO consider changing to struct
    pendingDebitBalance: string;                    // pending debit value - only increases - string in currency format
    postedDebitBalance: string;                     // posted debit value - only increases - string in currency format
    pendingCreditBalance: string;                   // pending credit value - only increases - string in currency format
    postedCreditBalance: string;                    // posted credit value - only increases - string in currency format
    balance: string;                                // posted balance - string in currency format
    timestampLastJournalEntry: number | null;       // null if no entries exist yet
}
