/*
/!*****
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
 ******!/

"use strict";

// Logger.
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	AccountAlreadyExistsError, AccountState, AccountType,
	Aggregate,
	IAccount,
	IAccountsRepo,
	IJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-domain";
import {MongoAccountsRepo} from "../../src/infrastructure/mongo_accounts_repo";
import {MongoJournalEntriesRepo} from "../../src/infrastructure/mongo_journal_entries_repo";
import {Account} from "@mojaloop/accounts-and-balances-bc-domain/dist/entities/account";

/!* Constants. *!/
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
const accountsRep: IAccountsRepo = new MongoAccountsRepo(
	logger,
	REPO_URL,
	DB_NAME,
	ACCOUNTS_COLLECTION_NAME
);
const journalEntriesRepo: IJournalEntriesRepo = new MongoJournalEntriesRepo(
	logger,
	REPO_URL,
	DB_NAME,
	JOURNAL_ENTRIES_COLLECTION_NAME
);
// Domain.
const aggregate: Aggregate = new Aggregate(
	logger,
	accountsRep,
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
		const accountBIdExpected: string = Date.now().toString();
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
		const journalEntryA = { // TODO.
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timeStamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString();
		const journalEntryB = { // TODO.
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timeStamp: 0
		}
	});
	test("create existent journal entries", async () => {
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA = { // TODO.
			id: accountAIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timeStampLastJournalEntry: 0
		}
		const statusCodeResponseCreateAccountA: number = await accountsAndBalancesClientMock.createAccount(accountA);
		expect(statusCodeResponseCreateAccountA).toBe(200);
		// Account B.
		const accountBIdExpected: string = Date.now().toString();
		const accountB = { // TODO.
			id: accountBIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timeStampLastJournalEntry: 0
		}
		const statusCodeResponseCreateAccountB: number = await accountsAndBalancesClientMock.createAccount(accountB);
		expect(statusCodeResponseCreateAccountB).toBe(200);
		// Journal entry A.
		const journalEntryAIdExpected: string = Date.now().toString();
		const journalEntryA = { // TODO.
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timeStamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString();
		const journalEntryB = { // TODO.
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timeStamp: 0
		}
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const account: IAccount | null = await aggregate.getAccountById(accountId);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
	});
	test("get existent accounts by external id", async () => {
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
	});
	test("get existent journal entries by account id", async () => {
	});
});
*/
