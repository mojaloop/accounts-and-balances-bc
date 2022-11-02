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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {randomUUID} from "crypto";
import {IJournalEntriesRepo, JournalEntryAlreadyExistsError} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {MongoJournalEntriesRepo} from "@mojaloop/accounts-and-balances-bc-infrastructure-lib";
import {IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "mongo-journal-entries-repo-integration-tests";
const SERVICE_VERSION: string = "0.0.1";
const MONGO_HOST: string = "localhost";
const MONGO_PORT_NO: number = 27017;
const MONGO_TIMEOUT_MS: number = 5000;
const MONGO_USERNAME: string = "accounts-and-balances-bc";
const MONGO_PASSWORD: string = "123456789";
const MONGO_DB_NAME: string = "accounts_and_balances_bc";
const MONGO_JOURNAL_ENTRIES_COLLECTION_NAME: string = "journal_entries";

let journalEntriesRepo: IJournalEntriesRepo;

describe("accounts and balances infrastructure library - MongoJournalEntriesRepo integration tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
		journalEntriesRepo = new MongoJournalEntriesRepo(
			logger,
			MONGO_HOST,
			MONGO_PORT_NO,
			MONGO_TIMEOUT_MS,
			MONGO_USERNAME,
			MONGO_PASSWORD,
			MONGO_DB_NAME,
			MONGO_JOURNAL_ENTRIES_COLLECTION_NAME
		);
		await journalEntriesRepo.init();
	});

	afterAll(async () => {
		await journalEntriesRepo.destroy();
	});

	/* journalEntryExistsById() */

	test("journalEntryExistsById with non-existent journal entry", async () => {
		const journalEntryId: string = randomUUID();
		const journalEntryExists: boolean = await journalEntriesRepo.journalEntryExistsById(journalEntryId);
		expect(journalEntryExists).toBe(false);
	});

	test("journalEntryExistsById with existent journal entry", async () => {
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: 5
		};

		await journalEntriesRepo.storeNewJournalEntry(journalEntryDto);

		const journalEntryExists: boolean = await journalEntriesRepo.journalEntryExistsById(journalEntryId);
		expect(journalEntryExists).toBe(true);
	});

	/* storeNewJournalEntry() */

	test("storeNewJournalEntry with non-existent journal entry", async () => {
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: 5
		};

		await journalEntriesRepo.storeNewJournalEntry(journalEntryDto);
	});

	test("storeNewJournalEntry with existent journal entry", async () => {
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: 5
		};

		await journalEntriesRepo.storeNewJournalEntry(journalEntryDto);

		await expect(
			async () => {
				await journalEntriesRepo.storeNewJournalEntry(journalEntryDto);
			}
		).rejects.toThrow(JournalEntryAlreadyExistsError);
	});

	/* getJournalEntriesByAccountId() */

	test("getJournalEntriesByAccountId with non-existent account id", async () => {
		const accountId: string = randomUUID();
		const journalEntryDtosReceived: IJournalEntryDto[] =
			await journalEntriesRepo.getJournalEntriesByAccountId(accountId);
		expect(journalEntryDtosReceived).toEqual([]);
	});

	test("getJournalEntriesByAccountId with existent account id", async () => {
		const accountId: string = randomUUID();

		const idJournalEntryA: string = randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: accountId,
			creditedAccountId: "b",
			timestamp: 1
		};
		await journalEntriesRepo.storeNewJournalEntry(journalEntryDtoA);

		const idJournalEntryB: string = randomUUID();
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: 2
		};
		await journalEntriesRepo.storeNewJournalEntry(journalEntryDtoB);

		const idJournalEntryC: string = randomUUID();
		const journalEntryDtoC: IJournalEntryDto = {
			id: idJournalEntryC,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: "a",
			creditedAccountId: accountId,
			timestamp: 3
		};
		await journalEntriesRepo.storeNewJournalEntry(journalEntryDtoC);

		const idJournalEntryD: string = randomUUID();
		const journalEntryDtoD: IJournalEntryDto = {
			id: idJournalEntryD,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "10",
			debitedAccountId: "b",
			creditedAccountId: "a",
			timestamp: 4
		};
		await journalEntriesRepo.storeNewJournalEntry(journalEntryDtoD);

		const journalEntryDtosReceived: IJournalEntryDto[] =
			await journalEntriesRepo.getJournalEntriesByAccountId(accountId);
		expect(journalEntryDtosReceived).toEqual([journalEntryDtoA, journalEntryDtoC]);
	});
});
