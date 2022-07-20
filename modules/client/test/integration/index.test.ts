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

// TODO: repeat code?

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesClient} from "../../src";
import {UnableToCreateAccountError, UnableToCreateJournalEntriesError} from "../../src/errors";
import {IAccountDTO, IJournalEntryDTO} from "../../src/types";

// TODO: here or inside the describe function?
const ACCOUNTS_AND_BALANCES_URL: string = "http://localhost:1234";
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

const logger: ILogger = new ConsoleLogger(); // TODO: which type of logger to use?
const accountsAndBalancesClient: AccountsAndBalancesClient = new AccountsAndBalancesClient(
	logger,
	ACCOUNTS_AND_BALANCES_URL,
	HTTP_CLIENT_TIMEOUT_MS
);

describe("accounts and balances client - integration tests", () => {
	// Create account.
	test("create non-existent account", async () => {
		const accountIdExpected: string = Date.now().toString();
		const account: IAccountDTO = { // TODO.
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
		const accountIdExpected: string = Date.now().toString();
		const account: IAccountDTO = { // TODO.
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
		await expect(
			async () => {
				await accountsAndBalancesClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError); // TODO.
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA: IAccountDTO = { // TODO.
			id: accountAIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountAIdReceived: string = await accountsAndBalancesClient.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		// Account B.
		const accountBIdExpected: string = Date.now().toString();
		const accountB: IAccountDTO = { // TODO.
			id: accountBIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountBIdReceived: string = await accountsAndBalancesClient.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		// Journal entry A.
		const journalEntryAIdExpected: string = Date.now().toString();
		const journalEntryA: IJournalEntryDTO = { // TODO.
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString();
		const journalEntryB: IJournalEntryDTO = { // TODO.
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timestamp: 0
		}
		const idsJournalEntriesReceived: string[] =
			await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntriesReceived).toEqual([journalEntryAIdExpected, journalEntryBIdExpected]);
	});
	test("create existent journal entries", async () => {
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA: IAccountDTO = { // TODO.
			id: accountAIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountAIdReceived: string = await accountsAndBalancesClient.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		// Account B.
		const accountBIdExpected: string = Date.now().toString();
		const accountB: IAccountDTO = { // TODO.
			id: accountBIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountBIdReceived: string = await accountsAndBalancesClient.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		// Journal entry A.
		const journalEntryAIdExpected: string = Date.now().toString();
		const journalEntryA: IJournalEntryDTO = { // TODO.
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString();
		const journalEntryB: IJournalEntryDTO = { // TODO.
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timestamp: 0
		}
		const idsJournalEntriesReceived: string[] =
			await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntriesReceived).toEqual([journalEntryAIdExpected, journalEntryBIdExpected]);
		await expect(
			async () => {
				await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError); // TODO.
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Date.now().toString();
		const account: IAccountDTO | null = await accountsAndBalancesClient.getAccountById(accountId);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountIdExpected: string = Date.now().toString();
		const accountSent: IAccountDTO = { // TODO.
			id: accountIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountIdReceived: string = await accountsAndBalancesClient.createAccount(accountSent);
		expect(accountIdReceived).toBe(accountIdExpected);
		const accountReceived: IAccountDTO | null = await accountsAndBalancesClient.getAccountById(accountIdExpected);
		expect(accountReceived?.id).toBe(accountIdExpected);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		const accounts: IAccountDTO[] = await accountsAndBalancesClient.getAccountsByExternalId(externalId);
		expect(accounts).toEqual([]); // TODO.
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = Date.now().toString();
		// Account A.
		const accountAIdExpected: string = Date.now().toString();
		const accountA: IAccountDTO = { // TODO.
			id: accountAIdExpected,
			externalId: externalId,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountAIdReceived: string = await accountsAndBalancesClient.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		// Account B.
		const accountBIdExpected: string = Date.now().toString();
		const accountB: IAccountDTO = { // TODO.
			id: accountBIdExpected,
			externalId: externalId,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountBIdReceived: string = await accountsAndBalancesClient.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		const accounts: IAccountDTO[] = await accountsAndBalancesClient.getAccountsByExternalId(externalId);
		expect(accounts).toEqual([accountA, accountB]); // TODO.
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		const journalEntries: IJournalEntryDTO[] = await accountsAndBalancesClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]); // TODO.
	});
	test("get existent journal entries by account id", async () => {
		const accountId: string = Date.now().toString();
		// The accounts regarding the journal entries need to be created first.
		// Account A.
		const accountAIdExpected: string = accountId;
		const accountA: IAccountDTO = { // TODO.
			id: accountAIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountAIdReceived: string = await accountsAndBalancesClient.createAccount(accountA);
		expect(accountAIdReceived).toBe(accountAIdExpected);
		// Account B.
		const accountBIdExpected: string = Date.now().toString();
		const accountB: IAccountDTO = { // TODO.
			id: accountBIdExpected,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		}
		const accountBIdReceived: string = await accountsAndBalancesClient.createAccount(accountB);
		expect(accountBIdReceived).toBe(accountBIdExpected);
		// Journal entry A.
		const journalEntryAIdExpected: string = Date.now().toString();
		const journalEntryA: IJournalEntryDTO = { // TODO.
			id: journalEntryAIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountAIdExpected,
			debitedAccountId: accountBIdExpected,
			timestamp: 0
		}
		// Journal entry B.
		const journalEntryBIdExpected: string = (Date.now() + 1).toString(); // +1 because otherwise the time is the same as the last one. TODO.
		const journalEntryB: IJournalEntryDTO = { // TODO.
			id: journalEntryBIdExpected,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accountBIdExpected,
			debitedAccountId: accountAIdExpected,
			timestamp: 0
		}
		const idsJournalEntriesReceived: string[] =
			await accountsAndBalancesClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntriesReceived).toEqual([journalEntryAIdExpected, journalEntryBIdExpected]);
		const journalEntriesReceived: IJournalEntryDTO[] = await accountsAndBalancesClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntriesReceived).toEqual([journalEntryA, journalEntryB]); // TODO.
	});
});
