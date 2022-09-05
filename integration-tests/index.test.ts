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

import {LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
	AccountsAndBalancesHttpClient,
	IAccountDTO,
	IJournalEntryDTO,
	UnableToCreateAccountError,
	UnableToCreateJournalEntriesError
} from "@mojaloop/accounts-and-balances-bc-client-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {MLKafkaProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import * as uuid from "uuid";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "integration-tests";
const SERVICE_VERSION: string = "0.0.1";

// Message broker.
const MESSAGE_BROKER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST ?? "localhost";
const MESSAGE_BROKER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO ?? "") || 9092;
const MESSAGE_BROKER_URL: string = `${MESSAGE_BROKER_HOST}:${MESSAGE_BROKER_PORT_NO}`;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.INFO;
const LOGGING_TOPIC: string = `${BOUNDED_CONTEXT_NAME}_${SERVICE_NAME}_logging`;

// HTTP server.
const HTTP_SERVER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_HTTP_SERVER_HOST ?? "localhost";
const HTTP_SERVER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_HTTP_SERVER_PORT_NO ?? "") || 1234;

// Accounts and Balances HTTP client.
const BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE: string = `http://${HTTP_SERVER_HOST}:${HTTP_SERVER_PORT_NO}`;
const TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT: number = 10_000;

/* ********** Constants End ********** */

let logger: KafkaLogger;
let accountsAndBalancesHttpClient: AccountsAndBalancesHttpClient;
const ACCESS_TOKEN: string = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNSMHVoT2hpM05VbmJlMTF5SDZtOUZtcFpNN2JiRVl2czdpbGNfanN1MHMifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbXSwiaWF0IjoxNjYyMjE5NzQ5LCJleHAiOjQ4MTc5MTQ5NDksImF1ZCI6Im1vamFsb29wLnZuZXh0LmRlZmF1bHRfYXVkaWVuY2UiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjMyMDEvIiwic3ViIjoidXNlcjo6dXNlciIsImp0aSI6ImJjYzk3OWRlLTdkNzItNGUyNC04YjIyLWM5NjlmMDAwYTg0YSJ9.py8iSYZp0KtZ1os7vXoH8oOAZFQCJyj3gWNW3EQTGl-cS8U6ErJpEv0nGrNfPGIdwNgSBe0esjlLKU7hCA-p71AnToCxA3zDqMaB6Pm7FH376AP71VTTGNa2rcWMrQivPEFzlxpvlIV-KWVrJUE2j0-SVPjlSphBnqBHybID_y3I1Ix5eoKsotZrBNeVzYqRcN7lUnbdxb7Oi5-ss5bmmo__iAB4EaW8LfdgiIL3AsYrxWoRdsBNOa1v7AJ6v7z7HcWzdJ1hF_DgG7wX2sVRHZcCnT55bL-zb614csaUbEeOpOmQ5STsR9rdSFPfN2vzpD9OX6b2uHj4digHQtuCDA";

describe("accounts and balances - integration tests", () => {
	beforeAll(async () => {
		const kafkaProducerOptions: MLKafkaProducerOptions = {
			kafkaBrokerList: MESSAGE_BROKER_URL
			// TODO: producerClientId?
		}
		logger = new KafkaLogger( // TODO: ILogger? is this the logger to use?
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			kafkaProducerOptions,
			LOGGING_TOPIC,
			LOGGING_LEVEL
		);
		await logger.start(); // TODO: here or on the aggregate?
		accountsAndBalancesHttpClient = new AccountsAndBalancesHttpClient(
			logger,
			BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE,
			ACCESS_TOKEN,
			TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT
		);
	});

	afterAll(async () => {
		await logger.destroy();
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = uuid.v4();
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
		const accountIdReceived: string = await accountsAndBalancesHttpClient.createAccount(account);
		expect(accountIdReceived).toEqual(accountId);
	});
	test("create existent account", async () => {
		const accountId: string = uuid.v4();
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
		await accountsAndBalancesHttpClient.createAccount(account);
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
	});
	test("create account with empty string as id", async () => {
		const accountId: string = "";
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
		const accountIdReceived: string = await accountsAndBalancesHttpClient.createAccount(account);
		expect(accountIdReceived).not.toEqual(accountId); // TODO: makes sense?
	});
	test("create account with invalid credit balance", async () => {
		const accountId: string = uuid.v4();
		const account: IAccountDTO = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: -100,
			debitBalance: 25,
			timestampLastJournalEntry: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
	});
	test("create account with invalid debit balance", async () => {
		const accountId: string = uuid.v4();
		const account: IAccountDTO = {
			id: accountId,
			externalId: null,
			state: "ACTIVE",
			type: "POSITION",
			currency: "EUR",
			creditBalance: 100,
			debitBalance: -25,
			timestampLastJournalEntry: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
	});
	// TODO: verify.
	/*test("create account with unreachable server", async () => {
		const accountId: string = uuid.v4();
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
		// disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createAccount(account);
			}
		).rejects.toThrow(UnableToCreateAccountError);
		// enable();
	});*/

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA: IJournalEntryDTO = {
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
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB: IJournalEntryDTO = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		const idsJournalEntries: string[] =
			await accountsAndBalancesHttpClient.createJournalEntries([journalEntryA, journalEntryB]);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});
	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA: IJournalEntryDTO = {
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
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB: IJournalEntryDTO = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		await accountsAndBalancesHttpClient.createJournalEntries([journalEntryA, journalEntryB]);
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntryA, journalEntryB]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with empty string as id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = "";
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		const journalEntryIdReceived: string[] =
			await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
		expect(journalEntryIdReceived).not.toEqual(journalEntryId); // TODO: makes sense?
	});
	test("create journal entry with same credited and debited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: "some string",
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: "some string",
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with different currency", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts(); // Accounts created with EUR.
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "USD",
			amount: 5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with exceeding amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 10_000,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	test("create journal entry with invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntryDTO = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: -5,
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
	});
	// TODO: verify.
	/*test("create journal entry with unreachable server", async () => {
		const journalEntryId: string = uuid.v4();
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
		// disable();
		await expect(
			async () => {
				await accountsAndBalancesHttpClient.createJournalEntries([journalEntry]);
			}
		).rejects.toThrow(UnableToCreateJournalEntriesError);
		// enable();
	});*/

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = uuid.v4();
		const account: IAccountDTO | null = await accountsAndBalancesHttpClient.getAccountById(accountId);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountId: string = uuid.v4();
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
		await accountsAndBalancesHttpClient.createAccount(account);
		const accountReceived: IAccountDTO | null =
			await accountsAndBalancesHttpClient.getAccountById(accountId);
		expect(accountReceived).toEqual(account);
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = uuid.v4();
		const accounts: IAccountDTO[] = await accountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
		expect(accounts).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = uuid.v4();
		const accounts: any[] = await create2Accounts(externalId, externalId);
		const accountsReceived: IAccountDTO[] =
			await accountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
		expect(accountsReceived).toEqual(accounts);
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = uuid.v4();
		const journalEntries: IJournalEntryDTO[] =
			await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA: IJournalEntryDTO = {
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
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB: IJournalEntryDTO = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: 5,
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: 0
		};
		await accountsAndBalancesHttpClient.createJournalEntries([journalEntryA, journalEntryB]);
		const journalEntriesReceived: IJournalEntryDTO[] =
			await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accounts[0].id,);
		expect(journalEntriesReceived).toEqual([journalEntryA, journalEntryB]);
	});
});

async function create2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null
): Promise<any[]> {
	// Account A.
	const idAccountA: string = uuid.v4();
	const accountA: IAccountDTO = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: "ACTIVE",
		type: "POSITION",
		currency: "EUR",
		creditBalance: 100,
		debitBalance: 25,
		timestampLastJournalEntry: 0
	};
	await accountsAndBalancesHttpClient.createAccount(accountA);
	// Account B.
	const idAccountB: string = idAccountA + 1;
	const accountB: IAccountDTO = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: "ACTIVE",
		type: "POSITION",
		currency: "EUR",
		creditBalance: 100,
		debitBalance: 25,
		timestampLastJournalEntry: 0
	};
	await accountsAndBalancesHttpClient.createAccount(accountB);
	return [accountA, accountB];
}
