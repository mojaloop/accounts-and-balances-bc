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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

export interface ILedgerAccount{
    id: string | null;                                  // account id on the ledger - can be null when creating, create will return final id
    state: string;                                      // mapped from CoA - required information for ledger to create the account
    type: string;                                       // mapped from CoA - required information for ledger to create the account
    currencyCode: string;                               // mapped from CoA - mandatory
    debitBalance: string;                               // on create will be 0 (zero)
    creditBalance: string;                              // on create will be 0 (zero)
    balance: string;                                    // on create will be 0 (zero)
    timestampLastJournalEntry: number | null;           // null until an entry is recorded
}

export interface ILedgerJournalEntry{
    id: string | null;                                  // entry id on the ledger - can be null when creating, create will return final id
    currencyCode: string;                               // mapped from CoA - mandatory
    amount: string;                                     // mandatory - in normal number representation (ex: "100.34" or "52")
    debitedAccountId: string;                           // debited account id on the ledger
    creditedAccountId: string;                          // credited account id on the ledger
    timestamp: number | null;                           // only null on creation, controlled by the ledger
}

export interface ILedgerAdapter{
    setCurrencies(currencyList:{code:string, decimals:number}[]):void;

    createAccounts(accObjs: ILedgerAccount[]) : string[];
    getAccountsByIds(ids:string[]) : ILedgerAccount[];

    createJournalEntries(entryObjs: ILedgerJournalEntry[]) : string[];
    getJournalEntries(ids:string[]) : ILedgerJournalEntry;
}
