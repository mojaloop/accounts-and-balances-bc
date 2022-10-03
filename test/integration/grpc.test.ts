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
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {MLKafkaRawProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import * as Crypto from "crypto";
import {AccountsAndBalancesGrpcClient} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "integration-tests-grpc";
const SERVICE_VERSION: string = "0.0.1";

// Message broker.
const MESSAGE_BROKER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST ?? "localhost";
const MESSAGE_BROKER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO ?? "") || 9092;
const MESSAGE_BROKER_URL: string = `${MESSAGE_BROKER_HOST}:${MESSAGE_BROKER_PORT_NO}`;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.INFO;
const LOGGING_TOPIC: string = "logs";

// Accounts and Balances gRPC client.
const ACCOUNTS_AND_BALANCES_GRPC_URL: string = "localhost:5678";

/* ********** Constants End ********** */

let logger: KafkaLogger;
let accountsAndBalancesGrpcClient: AccountsAndBalancesGrpcClient;


jest.setTimeout(20000); // 20 secs - change this to suit the test (ms)

describe("accounts and balances - integration tests with gRPC service", () => {
	beforeAll(async () => {
		const kafkaProducerOptions: MLKafkaRawProducerOptions = {
			kafkaBrokerList: MESSAGE_BROKER_URL
		};
		logger = new KafkaLogger(
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			kafkaProducerOptions,
			LOGGING_TOPIC,
			LOGGING_LEVEL
		);
		await logger.init();
		// await startGrpcService(logger);
		accountsAndBalancesGrpcClient = new AccountsAndBalancesGrpcClient(
			logger, ACCOUNTS_AND_BALANCES_GRPC_URL
		);
		await accountsAndBalancesGrpcClient.init();
	});

	afterAll(async () => {
		await accountsAndBalancesGrpcClient.destroy();
		// await stopGrpcService();
		await logger.destroy();
	});

	test("create non-existent account", async () => {
		const accountId: string = Crypto.randomUUID();
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
		const accountIdReceived: string = await accountsAndBalancesGrpcClient.createAccount(accountDto);
		expect(accountIdReceived).toEqual(accountId);
	});

	test("create non-existent journal entry", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();

		// Journal entry A.
		const idJournalEntryA: string = Crypto.randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: "",
			externalCategory: "",
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: "",
			externalCategory: "",
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id!,
			debitedAccountId: accountDtos[0].id!,
			timestamp: 0
		};
		const idsJournalEntries: string[] = await accountsAndBalancesGrpcClient.createJournalEntries(
			[journalEntryDtoA, journalEntryDtoB]
		);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});

	test("get non-existent account by id", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto | null = await accountsAndBalancesGrpcClient.getAccountById(accountId);
		expect(accountDto).toEqual(null);
	});

	test("get non-existent accounts by external id", async () => {
		const externalId: string = Crypto.randomUUID();
		const accountDtos: IAccountDto[] = await accountsAndBalancesGrpcClient.getAccountsByExternalId(externalId);
		expect(accountDtos).toEqual([]);
	});

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Crypto.randomUUID();
		const journalEntryDtos: IJournalEntryDto[] =
			await accountsAndBalancesGrpcClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntryDtos).toEqual([]);
	});
});

async function create2Accounts(
	externalIdAccountA: string = "",
	externalIdAccountB: string = ""
): Promise<IAccountDto[]> {
	// Account A.
	const idAccountA: string = Crypto.randomUUID();
	const accountDtoA: IAccountDto = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: 0
	};
	await accountsAndBalancesGrpcClient.createAccount(accountDtoA);
	// Account B.
	const idAccountB: string = idAccountA + 1;
	const accountDtoB: IAccountDto = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: 0
	};
	await accountsAndBalancesGrpcClient.createAccount(accountDtoB);
	return [accountDtoA, accountDtoB];
}
