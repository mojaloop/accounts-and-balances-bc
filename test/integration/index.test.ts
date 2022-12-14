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
import {GrpcClient} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {Account, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {AccountsAndBalancesGrpcService} from "../../packages/grpc-svc/src/application/accounts_and_balances_grpc_service";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {
	IBuiltinLedgerAccountsRepo
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain/infrastructure";
import {
	BuiltinLedgerAccountsMongoRepo
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/implementations/builtin_ledger_accounts_mongo_repo";
import {BuiltinLedgerAccount} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain/entities";
import {AuthorizationClientMock} from "./authorization_client_mock";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "grpc-integration-tests";
const SERVICE_VERSION: string = "0.0.1";

// Event streamer.
const EVENT_STREAMER_HOST: string = "localhost";
const EVENT_STREAMER_PORT_NO: number = 9092;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.INFO;
const LOGGING_TOPIC: string = "logs";

// Repo.
const MONGO_HOST: string = "localhost";
const MONGO_PORT_NO: number = 27017;
const MONGO_TIMEOUT_MS: number = 5000;
const MONGO_USERNAME: string = "accounts-and-balances-bc";
const MONGO_PASSWORD: string = "123456789";
const MONGO_DB_NAME: string = "accounts_and_balances_bc";
const MONGO_ACCOUNTS_COLLECTION_NAME: string = "accounts";

// Accounts and Balances gRPC client.
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO: number = 1234;
const ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS: number = 5000;

// Hub account.
const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: bigint = 1_000_000n;

/* ********** Constants End ********** */

let grpcClient: GrpcClient;

jest.setTimeout(1_000_000_000);

describe("accounts and balances - integration tests with built-in ledger", () => {
	beforeAll(async () => {
		const logger: KafkaLogger = new KafkaLogger(
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			{kafkaBrokerList: `${EVENT_STREAMER_HOST}:${EVENT_STREAMER_PORT_NO}`},
			LOGGING_TOPIC,
			LOGGING_LEVEL
		);
		await logger.init();

		const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(logger);

		const builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo = new BuiltinLedgerAccountsMongoRepo(
			logger,
			MONGO_HOST,
			MONGO_PORT_NO,
			MONGO_TIMEOUT_MS,
			MONGO_USERNAME,
			MONGO_PASSWORD,
			MONGO_DB_NAME,
			MONGO_ACCOUNTS_COLLECTION_NAME
		);
		await builtinLedgerAccountsRepo.init();

		// Create the hub account, used to credit other accounts.
		const hubAccount: BuiltinLedgerAccount = {
			id: HUB_ACCOUNT_ID,
			state: "ACTIVE",
			type: "FEE",
			limitCheckMode: "NONE",
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: 0n,
			creditBalance: HUB_ACCOUNT_INITIAL_CREDIT_BALANCE,
			timestampLastJournalEntry: null
		};
		await builtinLedgerAccountsRepo.storeNewAccount(hubAccount);

		await AccountsAndBalancesGrpcService.start(logger, authorizationClient/*, undefined, builtinLedgerAccountsRepo*/);

		grpcClient = new GrpcClient(
			logger,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO,
			ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS
		);
		await grpcClient.init();
	});

	afterAll(async () => {
		await grpcClient.destroy();
		await AccountsAndBalancesGrpcService.stop();
	});

	/* createAccounts() */

	test("create non-existent account", async () => {
		const account: Account = {
			id: null,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		const accountId: string | undefined = (await grpcClient.createAccounts([account]))[0];
		expect(accountId).not.toBeUndefined();
		expect(accountId).not.toBeNull();
		expect(accountId).not.toEqual("");
	});

	/* createJournalEntries() */

	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: Account[] = await createAndCredit2Accounts();

		const journalEntryA: JournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id!,
			creditedAccountId: accounts[1].id!,
			timestamp: null
		};

		const journalEntryB: JournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[1].id!,
			creditedAccountId: accounts[0].id!,
			timestamp: null
		};

		const idsJournalEntries: string[] =
			await grpcClient.createJournalEntries([journalEntryA, journalEntryB]);

		expect(idsJournalEntries[0]).not.toBeUndefined();
		expect(idsJournalEntries[0]).not.toBeNull();
		expect(idsJournalEntries[0]).not.toEqual("");

		expect(idsJournalEntries[1]).not.toBeUndefined();
		expect(idsJournalEntries[1]).not.toBeNull();
		expect(idsJournalEntries[1]).not.toEqual("");
	});

	/* getAccountsByIds() */

	test("get non-existent account by id", async () => {
		const accountId: string = randomUUID();
		const account: Account | undefined = (await grpcClient.getAccountsByIds([accountId]))[0];
		expect(account).toBeUndefined();
	});

	/* getAccountsByOwnerId() */

	test("get non-existent accounts by owner id", async () => {
		const ownerId: string = randomUUID();
		const accounts: Account[] = await grpcClient.getAccountsByOwnerId(ownerId);
		expect(accounts).toEqual([]);
	});

	/* getJournalEntriesByAccountId() */

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const journalEntries: JournalEntry[] = await grpcClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]);
	});
});

async function createAndCredit2Accounts(
	ownerIdAccountA: string = "owner account A",
	ownerIdAccountB: string = "owner account B",
	creditBalance: string = "100",
): Promise<Account[]> {
	// Account A.
	const accountABeforeCrediting: Account = {
		id: null,
		ownerId: ownerIdAccountA,
		state: "ACTIVE",
		type: "FEE",
		currencyCode: "EUR",
		debitBalance: null,
		creditBalance: null,
		balance: null,
		timestampLastJournalEntry: null
	};
	const idAccountA: string | undefined = (await grpcClient.createAccounts([accountABeforeCrediting]))[0];

	// Account B.
	const accountBBeforeCrediting: Account = {
		id: null,
		ownerId: ownerIdAccountB,
		state: "ACTIVE",
		type: "FEE",
		currencyCode: "EUR",
		debitBalance: null,
		creditBalance: null,
		balance: null,
		timestampLastJournalEntry: null
	};
	const idAccountB: string | undefined = (await grpcClient.createAccounts([accountBBeforeCrediting]))[0];

	// Journal entry A, regarding the crediting of account A.
	const journalEntryA: JournalEntry = {
		id: null,
		ownerId: null,
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountA,
		timestamp: null
	};

	// Journal entry B, regarding the crediting of account B.
	const journalEntryB: JournalEntry = {
		id: null,
		ownerId: null,
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountB,
		timestamp: null
	};

	await grpcClient.createJournalEntries([journalEntryA, journalEntryB]);

	const accountAAfterCrediting: Account | undefined = (await grpcClient.getAccountsByIds([idAccountA]))[0];
	const accountBAfterCrediting: Account | undefined = (await grpcClient.getAccountsByIds([idAccountB]))[0];
	return [accountAAfterCrediting!, accountBAfterCrediting!];
}
