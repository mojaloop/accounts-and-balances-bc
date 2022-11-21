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

export type LedgerAccount = {
    id: string | null;
    state: string; // TODO: change type to AccountState?
    type: string; // TODO: change type to AccountType?
    currencyCode: string;
    debitBalance: string;
    creditBalance: string;
    balance: string;
    timestampLastJournalEntry: number | null;
}

export type LedgerJournalEntry = {
    id: string | null;
    currencyCode: string;
    amount: string;
    debitedAccountId: string;
    creditedAccountId: string;
    timestamp: number | null;
}

export interface ILedgerAdapter {
    init(): Promise<void>;
    destroy(): Promise<void>;

    setCurrencies(currencies: {code: string, decimals: number}[]): Promise<void>;

    createAccounts(ledgerAccounts: LedgerAccount[]): Promise<string[]>;
    createJournalEntries(ledgerJournalEntries: LedgerJournalEntry[]): Promise<string[]>;

    getAccountsByIds(accountIds: string[]): Promise<LedgerAccount[]>;
    getJournalEntriesByAccountId(accountId: string): Promise<LedgerJournalEntry[]>;
}
