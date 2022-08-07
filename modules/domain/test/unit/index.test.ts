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
import {
	AccountState,
	AccountType,
	AccountAlreadyExistsError,
	IAccountsRepo,
	IJournalEntriesRepo,
	Aggregate,
	JournalEntryAlreadyExistsError,
	NoSuchAccountError,
	NoSuchJournalEntryError,
	IAccount,
	IJournalEntry
} from "../../src";
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
		const account: IAccount = {
			id: accountIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100n,
			debitBalance: 25n,
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string = await aggregate.createAccount(account);
		expect(accountIdReceived).toEqual(accountIdExpected);
	});
	test("create existent account", async () => {
		const accountIdExpected: string = Date.now().toString();
		const account: IAccount = {
			id: accountIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100n,
			debitBalance: 25n,
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string = await aggregate.createAccount(account);
		expect(accountIdReceived).toEqual(accountIdExpected);
		await expect(
			async () => {
				await aggregate.createAccount(account);
			}
		).rejects.toThrow(AccountAlreadyExistsError);
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		// Journal entry A.
		const journalEntryAId: string = Date.now().toString();
		const journalEntryA: IJournalEntry = {
			id: journalEntryAId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		}
		// Journal entry B.
		// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
		const journalEntryBId: string = journalEntryAId + 1;
		const journalEntryB: IJournalEntry = {
			id: journalEntryBId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		}
		const idsJournalEntries: string[] = await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntries).toEqual([journalEntryAId, journalEntryBId]);
	});
	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		// Journal entry A.
		const journalEntryAId: string = Date.now().toString();
		const journalEntryA: IJournalEntry = {
			id: journalEntryAId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		}
		// Journal entry B.
		// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
		const journalEntryBId: string = journalEntryAId + 1;
		const journalEntryB: IJournalEntry = {
			id: journalEntryBId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		}
		const idsJournalEntries: string[] = await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntries).toEqual([journalEntryAId, journalEntryBId]);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
			}
		).rejects.toThrow(JournalEntryAlreadyExistsError);
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const account: IAccount | null = await aggregate.getAccountById(accountId);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const accountCreated: IAccount = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100n,
			debitBalance: 25n,
			timestampLastJournalEntry: 0
		};
		await aggregate.createAccount(accountCreated);
		const accountReceived: IAccount | null = await aggregate.getAccountById(accountId);
		expect(accountReceived).toEqual(accountCreated);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const accounts: IAccount[] = await aggregate.getAccountsByExternalId(externalId);
		expect(accounts).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const accountsCreated: IAccount[] = await create2Accounts(externalId, externalId);
		const accountsReceived: IAccount[] = await aggregate.getAccountsByExternalId(externalId);
		expect(accountsReceived).toEqual(accountsCreated);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		const journalEntries: IJournalEntry[] = await aggregate.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		// Journal entry A.
		const journalEntryAId: string = Date.now().toString();
		const journalEntryA: IJournalEntry = {
			id: journalEntryAId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		}
		// Journal entry B.
		// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
		const journalEntryBId: string = journalEntryAId + 1;
		const journalEntryB: IJournalEntry = {
			id: journalEntryBId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		}
		await aggregate.createJournalEntries([journalEntryA, journalEntryB]);
		const journalEntriesReceived: IJournalEntry[] = await aggregate.getJournalEntriesByAccountId(accounts[0].id);
		expect(journalEntriesReceived).toEqual([journalEntryA, journalEntryB]);
	});

	// The following are less important tests, because the functions in question are not accessible by the client. TODO.

	// Delete account by id.
	test("delete non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		await expect(
			async () => {
				await aggregate.deleteAccountById(accountId);
			}
		).rejects.toThrow(NoSuchAccountError);
	});
	test("delete existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const account: IAccount = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100n,
			debitBalance: 25n,
			timestampLastJournalEntry: 0
		};
		await aggregate.createAccount(account);
		// TODO: just wait for the function to resolve or try to get the account after?
		// TODO: wait for the function to resolve.
		/*await expect(
			async () => {
				await aggregate.deleteAccountById(accountId);
			}
		).resolves;*/
	});

	// Delete journal entry by id.
	test("delete non-existent journal entry by id", async () => {
		const journalEntryId: string = Date.now().toString();
		await expect(
			async () => {
				await aggregate.deleteJournalEntryById(journalEntryId);
			}
		).rejects.toThrow(NoSuchJournalEntryError);
	});
	test("delete existent journal entry by id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = Date.now().toString();
		const journalEntry: IJournalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5n,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		}
		await aggregate.createJournalEntries([journalEntry]);
		// TODO: just wait for the function to resolve or try to get the journal entry after?
		// TODO: wait for the function to resolve.
		/*await expect(
			async () => {
				await aggregate.deleteJournalEntryById(journalEntryId);
			}
		).resolves;*/
	});

	// Delete all accounts.
	test("delete all accounts", async () => {
		// TODO: create accounts before?
		await aggregate.deleteAllAccounts();
		const accounts: IAccount[] = await aggregate.getAllAccounts();
		expect(accounts).toEqual([]); // TODO: do this or just wait for the function to resolve?
	});

	// Delete all journal entries.
	test("delete all journal entries", async () => {
		// TODO: create journal entries before?
		await aggregate.deleteAllJournalEntries();
		const journalEntries: IJournalEntry[] = await aggregate.getAllJournalEntries();
		expect(journalEntries).toEqual([]); // TODO: do this or just wait for the function to resolve?
	});
});

async function create2Accounts(
	accountAExternalId: string | null = null,
	accountBExternalId: string | null = null
): Promise<IAccount[]> {
	// Account A.
	const accountAId: string = Date.now().toString();
	const accountA: IAccount = {
		id: accountAId,
		externalId: accountAExternalId,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currency: "EUR",
		creditBalance: 100n,
		debitBalance: 25n,
		timestampLastJournalEntry: 0
	};
	await aggregate.createAccount(accountA);
	// Account B.
	// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
	const accountBId: string = accountAId + 1;
	const accountB: IAccount = {
		id: accountBId,
		externalId: accountBExternalId,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currency: "EUR",
		creditBalance: 100n,
		debitBalance: 25n,
		timestampLastJournalEntry: 0
	};
	await aggregate.createAccount(accountB);
	return [accountA, accountB];
}
