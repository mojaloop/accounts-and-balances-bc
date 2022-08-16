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

// TODO: import index.ts?
import {
	AccountState,
	AccountType,
	Aggregate,
	IAccountsRepo, IJournalEntriesRepo,
} from "@mojaloop/accounts-and-balances-bc-domain";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesClientMock} from "../accounts_and_balances_client_mock";
import {ExpressWebServer} from "../../src/web-server/express_web_server";
import {MongoAccountsRepo} from "../../src/infrastructure/mongo_accounts_repo";
import {MongoJournalEntriesRepo} from "../../src/infrastructure/mongo_journal_entries_repo";

// TODO: here or inside the describe function?
// Web server.
const WEB_SERVER_HOST: string =
	process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_HOST ?? "localhost";
const WEB_SERVER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_PORT_NO ?? "") || 1234;
const WEB_SERVER_PATH_ROUTER: string = "/";
// Repo.
const REPO_HOST: string =
	process.env.ACCOUNTS_AND_BALANCES_REPO_HOST ?? "localhost";
const REPO_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_REPO_PORT_NO ?? "") || 27017;
const REPO_URL: string = `mongodb://${REPO_HOST}:${REPO_PORT_NO}`;
const DB_NAME: string = "AccountsAndBalances";
const ACCOUNTS_COLLECTION_NAME: string = "Accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "JournalEntries";

const ACCOUNTS_AND_BALANCES_URL: string = `http://${WEB_SERVER_HOST}:${WEB_SERVER_PORT_NO}`;
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

const logger: ILogger = new ConsoleLogger(); // TODO: which type of logger to use?
const accountsRepo: IAccountsRepo = new MongoAccountsRepo(
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
const aggregate: Aggregate = new Aggregate(
	logger,
	accountsRepo,
	journalEntriesRepo
);
const webServer: ExpressWebServer = new ExpressWebServer(
	logger,
	WEB_SERVER_HOST,
	WEB_SERVER_PORT_NO,
	WEB_SERVER_PATH_ROUTER,
	aggregate
);
webServer.start();
const accountsAndBalancesClientMock: AccountsAndBalancesClientMock = new AccountsAndBalancesClientMock(
	logger,
	ACCOUNTS_AND_BALANCES_URL,
	HTTP_CLIENT_TIMEOUT_MS
);

describe("accounts and balances web server app - integration tests", () => {
	beforeAll(async () => {
		await aggregate.init();
	});

	afterAll(async () => {
		await aggregate.destroy();
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountIdExpected: string = Date.now().toString();
		const account = { // TODO.
			id: accountIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timeStampLastJournalEntry: 0
		}
		const statusCodeResponse: number = await accountsAndBalancesClientMock.createAccount(account);
		expect(statusCodeResponse).toBe(200);
	});
	test("create existent account", async () => {
		const accountIdExpected: string = Date.now().toString();
		const account = { // TODO.
			id: accountIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timeStampLastJournalEntry: 0
		}
		const statusCodeResponseCreateFirst: number = await accountsAndBalancesClientMock.createAccount(account);
		expect(statusCodeResponseCreateFirst).toBe(200);
		const statusCodeResponseCreateSecond: number = await accountsAndBalancesClientMock.createAccount(account);
		expect(statusCodeResponseCreateSecond).toBe(400);
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
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
		const statusCodeResponseCreateJournalEntries: number =
			await accountsAndBalancesClientMock.createJournalEntries([journalEntryA, journalEntryB]);
		expect(statusCodeResponseCreateJournalEntries).toBe(200);
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
		const statusCodeResponseCreateJournalEntriesFirst: number =
			await accountsAndBalancesClientMock.createJournalEntries([journalEntryA, journalEntryB]);
		expect(statusCodeResponseCreateJournalEntriesFirst).toBe(200);
		const statusCodeResponseCreateJournalEntriesSecond: number =
			await accountsAndBalancesClientMock.createJournalEntries([journalEntryA, journalEntryB]);
		expect(statusCodeResponseCreateJournalEntriesSecond).toBe(400);
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const statusCodeResponse: number = await accountsAndBalancesClientMock.getAccountById(accountId);
		expect(statusCodeResponse).toBe(404);
	});
	test("get existent account by id", async () => {
		const accountIdExpected: string = Date.now().toString();
		const accountSent = { // TODO.
			id: accountIdExpected,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timeStampLastJournalEntry: 0
		}
		const statusCodeResponseCreate: number = await accountsAndBalancesClientMock.createAccount(accountSent);
		expect(statusCodeResponseCreate).toBe(200);
		const statusCodeResponseGet: number = await accountsAndBalancesClientMock.getAccountById(accountIdExpected);
		expect(statusCodeResponseGet).toBe(200);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const statusCodeResponse: number = await accountsAndBalancesClientMock.getAccountsByExternalId(externalId);
		expect(statusCodeResponse).toBe(200);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA = { // TODO.
			id: accountAIdExpected,
			externalId: externalId,
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
			externalId: externalId,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timeStampLastJournalEntry: 0
		}
		const statusCodeResponseCreateAccountB: number = await accountsAndBalancesClientMock.createAccount(accountB);
		expect(statusCodeResponseCreateAccountB).toBe(200);
		const statusCodeResponseGetAccounts: number =
			await accountsAndBalancesClientMock.getAccountsByExternalId(externalId);
		expect(statusCodeResponseCreateAccountB).toBe(200);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		const statusCodeResponse: number = await accountsAndBalancesClientMock.getJournalEntriesByAccountId(accountId);
		expect(statusCodeResponse).toBe(200);
	});
	test("get existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = accountId;
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
		const journalEntryBIdExpected: string = (Date.now() + 1).toString(); // +1 because otherwise the time is the same as the last one. TODO.
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
		const statusCodeResponseCreateJournalEntries: number =
			await accountsAndBalancesClientMock.createJournalEntries([journalEntryA, journalEntryB]);
		expect(statusCodeResponseCreateJournalEntries).toBe(200);
		const statusCodeResponseGetJournalEntries: number =
			await accountsAndBalancesClientMock.getJournalEntriesByAccountId(accountId);
		expect(statusCodeResponseGetJournalEntries).toBe(200);
	});
});
