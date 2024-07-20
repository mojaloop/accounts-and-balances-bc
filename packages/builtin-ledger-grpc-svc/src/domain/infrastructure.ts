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

import {BuiltinLedgerAccount, BuiltinLedgerJournalEntry} from "./entities";
import {AnbAccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

// TODO: use DTOs instead? if so, they need to have the currency decimals.

export interface IBuiltinLedgerAccountsRepo {
	init(): Promise<void>;
	destroy(): Promise<void>;
	storeNewAccount(account: BuiltinLedgerAccount): Promise<void>;

    updateAccounts(accounts: BuiltinLedgerAccount[]): Promise<void>;

	getAccountsByIds(accountIds: string[]): Promise<BuiltinLedgerAccount[]>;
	updateAccountDebitBalanceAndTimestamp(
		accountId: string,
		newBalance: bigint,
		pending: boolean,
		timestampLastJournalEntry: number
	): Promise<void>;
	updateAccountCreditBalanceAndTimestamp(
		accountId: string,
		newBalance: bigint,
		pending: boolean,
		timestampLastJournalEntry: number
	): Promise<void>;
	updateAccountStatesByIds(accountIds: string[], accountState: AnbAccountState): Promise<void>;
}

export interface IBuiltinLedgerJournalEntriesRepo {
	init(): Promise<void>;
	destroy(): Promise<void>;
	storeNewJournalEntry(journalEntry: BuiltinLedgerJournalEntry): Promise<string>;
    storeNewJournalEntries(entries: BuiltinLedgerJournalEntry[]): Promise<string[]>;

    getJournalEntry(entryId: string): Promise<BuiltinLedgerJournalEntry|null>;
	getJournalEntriesByAccountId(accountId: string): Promise<BuiltinLedgerJournalEntry[]>;
    getJournalEntriesByOwnerId(ownerId: string): Promise<BuiltinLedgerJournalEntry[]>;
}
