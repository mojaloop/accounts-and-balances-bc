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
import {AccountsAndBalancesHttpServiceMock} from "./accounts_and_balances_http_service_mock";
import {AccountsAndBalancesHttpClient} from "../../src";
import {
	UnableToCreateAccountError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "../../src";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE: string = "http://localhost:1234";
const TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT: number = 10_000;

let accountsAndBalancesHttpServiceMock: AccountsAndBalancesHttpServiceMock;
let accountsAndBalancesHttpClient: AccountsAndBalancesHttpClient;

describe("accounts and balances http client library - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		accountsAndBalancesHttpServiceMock = new AccountsAndBalancesHttpServiceMock(
			logger,
			BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE
		);
		accountsAndBalancesHttpClient = new AccountsAndBalancesHttpClient(
			logger,
			BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE,
			TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT,
			AccountsAndBalancesHttpServiceMock.VALID_ACCESS_TOKEN
		);
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID;
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string =
			await accountsAndBalancesHttpClient.createAccount(accountDto);
		expect(accountIdReceived).toEqual(accountId);
	});
	test("create existent account", async () => {
		const accountId: string = AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID;
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createAccount(accountDto);
			}
		).rejects.toThrow(UnableToCreateAccountError);
	});
	test("create account with unreachable server", async () => {
		const accountId: string = AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID;
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		accountsAndBalancesHttpServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createAccount(accountDto);
			}
		).rejects.toThrow(UnableToCreateAccountError);
		accountsAndBalancesHttpServiceMock.enable();
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Journal entry A.
		const idJournalEntryA: string = AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		};
		// Journal entry B.
		// There's no problem in idJournalEntryA and idJournalEntryB being equal - the service mock compares them to
		// EXISTENT_JOURNAL_ENTRY_ID, not to each other.
		const idJournalEntryB: string = AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "b",
			debitedAccountId: "a",
			timestamp: 0
		};
		const idsJournalEntries: string[] = await accountsAndBalancesHttpClient.createJournalEntries(
			[journalEntryDtoA, journalEntryDtoB]
		);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});
	test("create existent journal entries", async () => {
		// Journal entry A.
		const idJournalEntryA: string = AccountsAndBalancesHttpServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "b",
			debitedAccountId: "a",
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries(
					[journalEntryDtoA, journalEntryDtoB]
				);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with unreachable server", async () => {
		const journalEntryId: string = AccountsAndBalancesHttpServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "a",
			debitedAccountId: "b",
			timestamp: 0
		};
		accountsAndBalancesHttpServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
		accountsAndBalancesHttpServiceMock.enable();
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountDto: IAccountDto | null = await accountsAndBalancesHttpClient.getAccountById(
			AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID
		);
		expect(accountDto).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountDto: IAccountDto | null =
			await accountsAndBalancesHttpClient.getAccountById(AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID);
		expect(accountDto?.id).toEqual(AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID);
	});
	test("get account with unreachable server", async () => {
		accountsAndBalancesHttpServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.getAccountById(
					AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID
				);
			}
		).rejects.toThrow(UnableToGetAccountError);
		accountsAndBalancesHttpServiceMock.enable();
	});
	test("get account with internal server error", async () => {
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.getAccountById(
					AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR
				);
			}
		).rejects.toThrow(UnableToGetAccountError);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const accountDtos: IAccountDto[] =await accountsAndBalancesHttpClient.getAccountsByExternalId(
			AccountsAndBalancesHttpServiceMock.NON_EXISTENT_EXTERNAL_ID
		);
		expect(accountDtos).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const accountDtos: IAccountDto[] = await accountsAndBalancesHttpClient.getAccountsByExternalId(
			AccountsAndBalancesHttpServiceMock.EXISTENT_EXTERNAL_ID
		);
		expect(accountDtos).toEqual([
			{id: AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_A},
			{id: AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_B}
		]);
	});
	test("get accounts with unreachable server", async () => {
		accountsAndBalancesHttpServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.getAccountsByExternalId(
					AccountsAndBalancesHttpServiceMock.EXISTENT_EXTERNAL_ID
				);
			}
		).rejects.toThrow(UnableToGetAccountsError);
		accountsAndBalancesHttpServiceMock.enable();
	});
	test("get accounts with internal server error", async () => {
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.getAccountsByExternalId(
					AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR
				);
			}
		).rejects.toThrow(UnableToGetAccountsError);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const journalEntryDtos: IJournalEntryDto[] = await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(
			AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID
		);
		expect(journalEntryDtos).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
		const journalEntryDtos: IJournalEntryDto[] = await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(
			AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID
		);
		expect(journalEntryDtos).toEqual([
			{id: AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_A},
			{id: AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_B}
		])
	});
	test("get journal entries with unreachable server", async () => {
		accountsAndBalancesHttpServiceMock.disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(
					AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID
				);
			}
		).rejects.toThrow(UnableToGetJournalEntriesError);
		accountsAndBalancesHttpServiceMock.enable();
	});
	test("get journal entries with internal server error", async () => {
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(
					AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR
				);
			}
		).rejects.toThrow(UnableToGetJournalEntriesError);
	});
});
