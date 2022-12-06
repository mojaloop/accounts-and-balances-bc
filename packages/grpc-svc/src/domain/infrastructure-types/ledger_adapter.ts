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

import {AccountState, AccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export type LedgerAdapterAccount = {
    id: string | null;
    state: AccountState;
    type: AccountType;
    currencyCode: string;
    currencyDecimals: number | null; // Only for when creating. TODO: | null?
    debitBalance: string | null;
    creditBalance: string | null;
    timestampLastJournalEntry: number | null;
}

export type LedgerAdapterJournalEntry = {
    id: string | null;
    ownerId: string | null;
    currencyCode: string;
    currencyDecimals: number | null; // // Only for when creating. TODO: | null?
    amount: string;
    debitedAccountId: string;
    creditedAccountId: string;
    timestamp: number | null;
}

export type LedgerAdapterRequestId = { // TODO: should this be an object or an array? find a better name.
    id: string,
    currencyDecimals: number
}

export interface ILedgerAdapter {
    init(): Promise<void>;
    destroy(): Promise<void>;

    createAccounts(ledgerAdapterAccounts: LedgerAdapterAccount[]): Promise<string[]>;
    createJournalEntries(ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[]): Promise<string[]>;

    getAccountsByIds(ledgerAccountIds: LedgerAdapterRequestId[]): Promise<LedgerAdapterAccount[]>;
    getJournalEntriesByAccountId(
        ledgerAccountId: string,
        currencyDecimals: number
    ): Promise<LedgerAdapterJournalEntry[]>;
}
