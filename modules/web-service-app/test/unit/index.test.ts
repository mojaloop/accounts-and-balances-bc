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

import {
	Aggregate,
	IAccountsRepo,
	IJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-domain";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ExpressWebServer} from "../../src/web-server/express_web_server";
import {MemoryAccountsRepo} from "./memory_accounts_repo";
import {MemoryJournalEntriesRepo} from "./memory_journal_entries_repo";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {AuditClientMock} from "./audit_client_mock";
import {AuxiliaryClient} from "./auxiliary_client";
import {TokenHelperServiceMock} from "./token_helper_service_mock";

/* ********** Constants Begin ********** */

// Token helper. TODO: names and values.
const TOKEN_HELPER_ISSUER_NAME: string =
	process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_ISSUER_NAME ?? "vNext Security BC - Authorization Svc";
const TOKEN_HELPER_JWKS_URL: string =
	process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_JWKS_URL ?? "http://localhost:3000/.well-known/jwks.json";
const TOKEN_HELPER_AUDIENCE: string =
	process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_AUDIENCE ?? "mojaloop.vnext.default_audience";

// Data base.
const DB_HOST: string = process.env.ACCOUNTS_AND_BALANCES_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "accounts-and-balances";
const ACCOUNTS_COLLECTION_NAME: string = "accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "journal-entries";

// Web server.
const WEB_SERVER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_HOST ?? "localhost";
const WEB_SERVER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_PORT_NO ?? "") || 1234;
const WEB_SERVER_PATH_ROUTER: string = "/";

// Accounts and Balances client.
const ACCOUNTS_AND_BALANCES_URL: string = `http://${WEB_SERVER_HOST}:${WEB_SERVER_PORT_NO}`;
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

/* ********** Constants End ********** */

let tokenHelperServiceMock: TokenHelperServiceMock;
let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let aggregate: Aggregate;
let auxiliaryClient: AuxiliaryClient;

describe("accounts and balances web server - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();

		tokenHelperServiceMock = new TokenHelperServiceMock(
			TOKEN_HELPER_ISSUER_NAME,
			TOKEN_HELPER_JWKS_URL,
			TOKEN_HELPER_AUDIENCE,
			logger
		);
		const tokenHelper: TokenHelper = new TokenHelper( // TODO: no interface?
			TOKEN_HELPER_ISSUER_NAME,
			TOKEN_HELPER_JWKS_URL,
			TOKEN_HELPER_AUDIENCE,
			logger
		);
		await tokenHelper.init(); // TODO: verify.
		const auditingClient: IAuditClient = new AuditClientMock();
		accountsRepo = new MemoryAccountsRepo(
			logger,
			DB_URL,
			DB_NAME,
			ACCOUNTS_COLLECTION_NAME
		);
		journalEntriesRepo = new MemoryJournalEntriesRepo(
			logger,
			DB_URL,
			DB_NAME,
			JOURNAL_ENTRIES_COLLECTION_NAME
		);
		aggregate = new Aggregate(
			logger,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);
		await aggregate.init();
		const webServer: ExpressWebServer = new ExpressWebServer(
			logger,
			WEB_SERVER_HOST,
			WEB_SERVER_PORT_NO,
			WEB_SERVER_PATH_ROUTER,
			tokenHelper,
			aggregate
		);
		webServer.start();

		auxiliaryClient = new AuxiliaryClient(
			logger,
			ACCOUNTS_AND_BALANCES_URL,
			HTTP_CLIENT_TIMEOUT_MS
		);
	});

	afterAll(async () => {
		await aggregate.destroy();
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = Date.now().toString();
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		const statusCodeResponse: number =
			await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create existent account", async () => {
		const accountId: string = Date.now().toString();
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		const statusCodeResponse: number =
			await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		expect(statusCodeResponse).toEqual(409);
	});
	test("create account with empty string as id", async () => {
		const accountId: string = "";
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		const statusCodeResponse: number =
			await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create account with invalid credit balance", async () => {
		const accountId: string = Date.now().toString();
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: -100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		const statusCodeResponse: number =
			await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create account with invalid debit balance", async () => {
		const accountId: string = Date.now().toString();
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: -25,
			timestampLastJournalEntry: 0
		};
		const statusCodeResponse: number =
			await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create account with unexpected accounts repo failure", async () => {
		const accountId: string = Date.now().toString();
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = true; // TODO: should this be done?
		const statusCodeResponse: number =
			await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		expect(statusCodeResponse).toEqual(500);
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = false; // TODO: should this be done?
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = Date.now().toString();
		const journalEntryA = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		// Journal entry B.
		// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = Date.now().toString();
		const journalEntryA = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		// Journal entry B.
		// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		await auxiliaryClient.createJournalEntries([journalEntryA, journalEntryB]);
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(statusCodeResponse).toEqual(409);
	});
	test("create journal entry with empty string as id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = "";
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create journal entry with same credited and debited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "some string",
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: "some string",
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with different currency", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts(); // Accounts created with EUR.
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "USD",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with exceeding amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 10_000,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: -5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with unexpected journal entries repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		(journalEntriesRepo as MemoryJournalEntriesRepo).unexpectedFailure = true; // TODO: should this be done?
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(500);
		(journalEntriesRepo as MemoryJournalEntriesRepo).unexpectedFailure = false; // TODO: should this be done?
	});
	test("create journal entry with unexpected accounts repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = Date.now().toString();
		const journalEntry = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = true; // TODO: should this be done?
		const statusCodeResponse: number = await auxiliaryClient.createJournalEntries([journalEntry]);
		expect(statusCodeResponse).toEqual(500);
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = false; // TODO: should this be done?
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const statusCodeResponse: number = await auxiliaryClient.getAccountById(accountId);
		expect(statusCodeResponse).toEqual(404);
	});
	test("get existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const account = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		await auxiliaryClient.createAccount(account, TokenHelperServiceMock.VALID_TOKEN);
		const statusCodeResponse: number = await auxiliaryClient.getAccountById(accountId);
		expect(statusCodeResponse).toEqual(200);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const statusCodeResponse: number = await auxiliaryClient.getAccountsByExternalId(externalId);
		expect(statusCodeResponse).toEqual(404);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const accounts: any[] = await create2Accounts(externalId, externalId);
		const statusCodeResponse: number = await auxiliaryClient.getAccountsByExternalId(externalId);
		expect(statusCodeResponse).toEqual(200);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		const statusCodeResponse: number = await auxiliaryClient.getJournalEntriesByAccountId(accountId);
		expect(statusCodeResponse).toEqual(404);
	});
	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = Date.now().toString();
		const journalEntryA = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		// Journal entry B.
		// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		await auxiliaryClient.createJournalEntries([journalEntryA, journalEntryB]);
		const statusCodeResponse: number =
			await auxiliaryClient.getJournalEntriesByAccountId(accounts[0].id);
		expect(statusCodeResponse).toEqual(200);
	});
});

async function create2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null
): Promise<any[]> {
	// Account A.
	const idAccountA: string = Date.now().toString();
	const accountA = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: "ACTIVE",
		type: "POSITION",
		currency: "EUR",
		creditBalance: 100,
		debitBalance: 25,
		timestampLastJournalEntry: 0
	};
	await auxiliaryClient.createAccount(accountA, TokenHelperServiceMock.VALID_TOKEN);
	// Account B.
	// If Date.now() is called again, the same number is returned (because not enough time passes between calls).
	const idAccountB: string = idAccountA + 1;
	const accountB = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: "ACTIVE",
		type: "POSITION",
		currency: "EUR",
		creditBalance: 100,
		debitBalance: 25,
		timestampLastJournalEntry: 0
	};
	await auxiliaryClient.createAccount(accountB, TokenHelperServiceMock.VALID_TOKEN);
	return [accountA, accountB];
}