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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesServiceMock} from "./accounts_and_balances_service_mock";
import {AccountsAndBalancesClient} from "../../src";
import {IAccountDTO, IJournalEntryDTO} from "../../src/types";
import {UnableToCreateAccountError, UnableToCreateJournalEntriesError} from "../../src/errors";

const ACCOUNTS_AND_BALANCES_URL: string = "http://localhost:1234";
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

const logger: ILogger = new ConsoleLogger();
const accountsAndBalancesServiceMock: AccountsAndBalancesServiceMock = new AccountsAndBalancesServiceMock(
	logger,
	ACCOUNTS_AND_BALANCES_URL
);
const accountsAndBalancesClient: AccountsAndBalancesClient = new AccountsAndBalancesClient(
	logger,
	ACCOUNTS_AND_BALANCES_URL,
	HTTP_CLIENT_TIMEOUT_MS
);

describe("accounts and balances client - unit tests", () => {
	// Create account.
	test("create non-existent account", async () => {
		const accountIdExpected: string = AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID;
		const account: IAccountDTO = {
			id: accountIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountIdReceived: string = await accountsAndBalancesClient.createAccount(account);
		expect(accountIdReceived).toBe(accountIdExpected);
	});
	test("create existent account", async () => {
		const accountIdExpected: string = AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID;
		const account: IAccountDTO = {
			id: accountIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		await expect(
			async () => {
				await accountsAndBalancesClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Journal entry A.
		const journalEntryAIdExpected: string = AccountsAndBalancesServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryA: IJournalEntryDTO = {
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = AccountsAndBalancesServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryB: IJournalEntryDTO = {
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "b",
			debitedAccountId: "a",
			timestamp: 0
		}
		const idsJournalEntriesReceived: string[] =
			await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntriesReceived).toEqual([journalEntryAIdExpected, journalEntryBIdExpected]);
	});
	test("create existent journal entries", async () => {
		// Journal entry A.
		const journalEntryAIdExpected: string = AccountsAndBalancesServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryA: IJournalEntryDTO = {
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = AccountsAndBalancesServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryB: IJournalEntryDTO = {
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "b",
			debitedAccountId: "a",
			timestamp: 0
		}
		await expect(
			async () => {
				await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const account: IAccountDTO | null =
			await accountsAndBalancesClient.getAccountById(AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
		const account: IAccountDTO | null =
			await accountsAndBalancesClient.getAccountById(AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID);
		expect(account?.id).toBe(AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const accounts: IAccountDTO[] = await accountsAndBalancesClient
			.getAccountsByExternalId(AccountsAndBalancesServiceMock.NON_EXISTENT_EXTERNAL_ID);
		expect(accounts).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const accounts: IAccountDTO[] = await accountsAndBalancesClient
			.getAccountsByExternalId(AccountsAndBalancesServiceMock.EXISTENT_EXTERNAL_ID);
		expect(accounts).toEqual([
			{id: AccountsAndBalancesServiceMock.ID_ACCOUNT_A},
			{id: AccountsAndBalancesServiceMock.ID_ACCOUNT_B}
		]);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const journalEntries: IJournalEntryDTO[] = await accountsAndBalancesClient
			.getJournalEntriesByAccountId(AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID);
		expect(journalEntries).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
		const journalEntries: IJournalEntryDTO[] = await accountsAndBalancesClient
			.getJournalEntriesByAccountId(AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID);
		expect(journalEntries).toEqual([
			{id: AccountsAndBalancesServiceMock.ID_JOURNAL_ENTRY_A},
			{id: AccountsAndBalancesServiceMock.ID_JOURNAL_ENTRY_B}
		]);
	});
});
