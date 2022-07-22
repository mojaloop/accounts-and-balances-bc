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

// Logger.
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Account} from "../../src/entities/account";
import {JournalEntry} from "../../src/entities/journal_entry";
import {
	AccountState,
	AccountType,
	AccountAlreadyExistsError,
	IAccountsRepo,
	IJournalEntriesRepo,
	Aggregate,
	JournalEntryAlreadyExistsError} from "../../src";
import {MemoryAccountsRepo} from "./mocks/memory_accounts_repo_mock";
import {MemoryJournalEntriesRepo} from "./mocks/memory_journal_entries_repo_mock";

/* Constants. */
// Repo.
const REPO_HOST: string =
	process.env.ACCOUNTS_AND_BALANCES_REPO_HOST ?? "localhost";
const REPO_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_REPO_PORT_NO ?? "") || 27017;
const REPO_URL: string = `mongodb://${REPO_HOST}:${REPO_PORT_NO}`;
const DB_NAME: string = "AccountsAndBalances";
const ACCOUNTS_COLLECTION_NAME: string = "Accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "JournalEntries";

const logger: ILogger = new ConsoleLogger();
// Infrastructure.
const accountsRepo: IAccountsRepo = new MemoryAccountsRepo(
	logger,
	REPO_URL,
	DB_NAME,
	ACCOUNTS_COLLECTION_NAME
);
const journalEntriesRepo: IJournalEntriesRepo = new MemoryJournalEntriesRepo(
	logger,
	REPO_URL,
	DB_NAME,
	JOURNAL_ENTRIES_COLLECTION_NAME
);
// Domain.
const aggregate: Aggregate = new Aggregate(
	logger,
	accountsRepo,
	journalEntriesRepo
);

describe("accounts and balances service - unit tests", () => {
	beforeAll(async () => {
		await aggregate.init();
	});

	afterAll(async () => {
		await aggregate.destroy();
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountIdExpected: string = Date.now().toString();
		const account: Account = new Account(
			accountIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountIdReceived: string = await aggregate.createAccount(account);
		expect(accountIdReceived).toBe(accountIdExpected);
	});
	test("create existent account", async () => {
		const accountIdExpected: string = Date.now().toString();
		const account: Account = new Account(
			accountIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountIdReceived: string = await aggregate.createAccount(account);
		expect(accountIdReceived).toBe(accountIdExpected);
		await expect(
			async () => {
				await aggregate.createAccount(account);
			}
		).rejects.toThrow(AccountAlreadyExistsError);
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA: Account = new Account(
			accountAIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountAIdReceived: string = await aggregate.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		// Account B.
		const accountBIdExpected: string = (Date.now() + 1).toString();
		const accountB: Account = new Account(
			accountBIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountBIdReceived: string = await aggregate.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		// Journal entry A.
		const journalEntryAIdExpected: string = Date.now().toString();
		const journalEntryA: JournalEntry = {
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString();
		const journalEntryB: JournalEntry = {
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timestamp: 0
		}
		const idsJournalEntries: string[] = await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntries).toEqual([journalEntryAIdExpected, journalEntryBIdExpected]);
	});
	test("create existent journal entries", async () => {
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA: Account = new Account(
			accountAIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountAIdReceived: string = await aggregate.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		// Account B.
		const accountBIdExpected: string = (Date.now() + 1).toString();
		const accountB: Account = new Account(
			accountBIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountBIdReceived: string = await aggregate.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		// Journal entry A.
		const journalEntryAIdExpected: string = Date.now().toString();
		const journalEntryA: JournalEntry = {
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString();
		const journalEntryB: JournalEntry = {
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timestamp: 0
		}
		const idsJournalEntries: string[] = await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntries).toEqual([journalEntryAIdExpected, journalEntryBIdExpected]);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
			}
		).rejects.toThrow(JournalEntryAlreadyExistsError);
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const account: Account | null = await aggregate.getAccountById(accountId);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountIdExpected: string = Date.now().toString();
		const accountSent: Account = new Account(
			accountIdExpected,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountIdReceived: string = await aggregate.createAccount(accountSent);
		expect(accountIdReceived).toBe(accountIdExpected);
		const accountReceived: Account | null = await aggregate.getAccountById(accountIdExpected);
		expect(accountReceived).toEqual(accountSent);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const accounts: Account[] = await aggregate.getAccountsByExternalId(externalId);
		expect(accounts).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const accountAIdExpected: string = Date.now().toString();
		const accountA: Account = new Account(
			accountAIdExpected,
			externalId,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountAIdReceived: string = await aggregate.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		const accountBIdExpected: string = (Date.now() + 1).toString();
		const accountB: Account = new Account(
			accountBIdExpected,
			externalId,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountBIdReceived: string = await aggregate.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		const accounts: Account[] = await aggregate.getAccountsByExternalId(externalId);
		expect(accounts).toEqual([accountA, accountB]);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		const journalEntries: JournalEntry[] = await aggregate.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
	});
});
