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
import {
	IAccountDTO,
	IJournalEntryDTO,
	UnableToCreateAccountError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "../../src";

const ACCOUNTS_AND_BALANCES_URL: string = "http://localhost:5678";
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

let accountsAndBalancesServiceMock: AccountsAndBalancesServiceMock;
let accountsAndBalancesClient: AccountsAndBalancesClient;

describe("accounts and balances client - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		accountsAndBalancesServiceMock = new AccountsAndBalancesServiceMock(
			logger,
			ACCOUNTS_AND_BALANCES_URL
		);
		accountsAndBalancesClient = new AccountsAndBalancesClient(
			logger,
			ACCOUNTS_AND_BALANCES_URL,
			HTTP_CLIENT_TIMEOUT_MS
		);
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID;
		const account: IAccountDTO = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string = await accountsAndBalancesClient.createAccount(account);
		expect(accountIdReceived).toEqual(accountId);
	});
	test("create existent account", async () => {
		const accountId: string = AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID;
		const account: IAccountDTO = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
	});
	test("create account with unreachable server", async () => {
		const accountId: string = AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID;
		const account: IAccountDTO = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		accountsAndBalancesServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
		accountsAndBalancesServiceMock.enable();
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Journal entry A.
		const idJournalEntryA: string = AccountsAndBalancesServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryA: IJournalEntryDTO = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		};
		// Journal entry B.
		// There's no problem in idJournalEntryA and idJournalEntryB being equal - the service mock compares them to
		// EXISTENT_JOURNAL_ENTRY_ID, not to each other.
		const idJournalEntryB: string = AccountsAndBalancesServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryB: IJournalEntryDTO = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "b",
			debitedAccountId: "a",
			timestamp: 0
		};
		const idsJournalEntries: string[] =
			await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});
	test("create existent journal entries", async () => {
		// Journal entry A.
		const idJournalEntryA: string = AccountsAndBalancesServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryA: IJournalEntryDTO = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = AccountsAndBalancesServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryB: IJournalEntryDTO = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "b",
			debitedAccountId: "a",
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with unreachable server", async () => {
		const journalEntryId: string = AccountsAndBalancesServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		};
		accountsAndBalancesServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
		accountsAndBalancesServiceMock.enable();
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
		expect(account?.id).toEqual(AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID);
	});
	test("get account with unreachable server", async () => {
		accountsAndBalancesServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesClient.getAccountById(AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID);
			}
		).rejects.toThrow(UnableToGetAccountError);
		accountsAndBalancesServiceMock.enable();
	});
	test("get account with internal server error", async () => {
		await expect(
			async () => {
				await accountsAndBalancesClient.getAccountById(AccountsAndBalancesServiceMock.ID_INTERNAL_SERVER_ERROR);
			}
		).rejects.toThrow(UnableToGetAccountError);
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
	test("get accounts with unreachable server", async () => {
		accountsAndBalancesServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesClient
					.getAccountsByExternalId(AccountsAndBalancesServiceMock.EXISTENT_EXTERNAL_ID);
			}
		).rejects.toThrow(UnableToGetAccountsError);
		accountsAndBalancesServiceMock.enable();
	});
	test("get accounts with internal server error", async () => {
		await expect(
			async () => {
				await accountsAndBalancesClient
					.getAccountsByExternalId(AccountsAndBalancesServiceMock.ID_INTERNAL_SERVER_ERROR);
			}
		).rejects.toThrow(UnableToGetAccountsError);
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
	test("get journal entries with unreachable server", async () => {
		accountsAndBalancesServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesClient
					.getJournalEntriesByAccountId(AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID);
			}
		).rejects.toThrow(UnableToGetJournalEntriesError);
		accountsAndBalancesServiceMock.enable();
	});
	test("get journal entries with internal server error", async () => {
		await expect(
			async () => {
				await accountsAndBalancesClient
					.getJournalEntriesByAccountId(AccountsAndBalancesServiceMock.ID_INTERNAL_SERVER_ERROR);
			}
		).rejects.toThrow(UnableToGetJournalEntriesError);
	});
});
