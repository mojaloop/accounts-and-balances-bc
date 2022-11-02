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

import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export interface IAccountsRepo {
	init(): Promise<void>;
	destroy(): Promise<void>;
	accountExistsById(accountId: string): Promise<boolean>;
	storeNewAccount(account: IAccountDto): Promise<void>; // Throws if account.id is not unique.
	getAccountById(accountId: string): Promise<IAccountDto | null>;
	getAccountsByExternalId(externalId: string): Promise<IAccountDto[]>;
	updateAccountDebitBalanceAndTimestampById(
		accountId: string,
		debitBalance: string,
		timestampLastJournalEntry: number): Promise<void>;
	updateAccountCreditBalanceAndTimestampById(
		accountId: string,
		creditBalance: string,
		timestampLastJournalEntry: number): Promise<void>;
}

export interface IJournalEntriesRepo {
	init(): Promise<void>;
	destroy(): Promise<void>;
	journalEntryExistsById(journalEntryId: string): Promise<boolean>;
	storeNewJournalEntry(journalEntry: IJournalEntryDto): Promise<void>; // Throws if account.id is not unique.
	getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDto[]>;
}
