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

import {AccountsAndBalancesAccountState, AccountsAndBalancesAccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export type LedgerAdapterAccount = {
    id: string | null;
    state: AccountsAndBalancesAccountState;
    type: AccountsAndBalancesAccountType;
    currencyCode: string;
    currencyDecimals: number | null; // Only for when creating.
    postedDebitBalance: string | null;
    pendingDebitBalance: string | null;
    postedCreditBalance: string | null;
    pendingCreditBalance: string | null;
    timestampLastJournalEntry: number | null;
}

export type LedgerAdapterJournalEntry = {
    id: string | null;
    ownerId: string | null;
    currencyCode: string;
    currencyDecimals: number | null; // // Only for when creating.
    amount: string;
    pending: boolean;
    debitedAccountId: string;
    creditedAccountId: string;
    timestamp: number | null;
}

export type LedgerAdapterRequestId = {
    id: string,
    currencyDecimals: number
}

export type LedgerAdapterCreateResponseItem = {
    requestedId: string;
    attributedId: string;
}

export interface ILedgerAdapter {
    init(): Promise<void>;
    destroy(): Promise<void>;

    setToken(accessToken: string): void;
    setUserCredentials(client_id: string, username: string, password: string): void;
    setAppCredentials(client_id: string, client_secret: string): void;

    createAccounts(
        createReq: {
            requestedId: string,
            type: string,
            currencyCode: string
        }[]
    ): Promise<LedgerAdapterCreateResponseItem[]>;

    createJournalEntries(
        createReq: {
            requestedId: string,
            amountStr: string,
            currencyCode: string,
            creditedAccountId: string,
            debitedAccountId: string,
            timestamp: number,
            ownerId: string,
            pending: boolean
        }[]
    ): Promise<LedgerAdapterCreateResponseItem[]>;

    getAccountsByIds(ledgerAccountIds: LedgerAdapterRequestId[]): Promise<LedgerAdapterAccount[]>;
    getJournalEntriesByAccountId(
        ledgerAccountId: string
    ): Promise<LedgerAdapterJournalEntry[]>;

    deleteAccountsByIds(accountIds: string[]): Promise<void>;
    deactivateAccountsByIds(accountIds: string[]): Promise<void>;
    reactivateAccountsByIds(accountIds: string[]): Promise<void>;
}
