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

import {randomUUID} from "crypto";
import {
	BuiltinLedgerGrpcAccount,
	BuiltinLedgerGrpcAccount__Output,
	BuiltinLedgerGrpcAccountArray, BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcClient,
	BuiltinLedgerGrpcId__Output, BuiltinLedgerGrpcIdArray,
	BuiltinLedgerGrpcIdArray__Output,
	BuiltinLedgerGrpcJournalEntry__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "../../src/domain/infrastructure";
import {BuiltinLedgerAccount} from "../../src/domain/entities";
import {BuiltinLedgerGrpcService} from "../../src/application";
import {BuiltinLedgerAccountsMemoryRepo} from "./builtin_ledger_accounts_memory_repo";
import {
	BuiltinLedgerJournalEntriesMemoryRepo,
} from "./builtin_ledger_journal_entries_memory_repo";
import {AuthenticationServiceMock} from "./authentication_service_mock";
import {AuthorizationClientMock} from "./authorization_client_mock";
import {AuditClientMock} from "./audit_client_mock";
import {bigintToString, stringToBigint} from "../../src/domain/converters";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "grpc-svc-unit-tests";
const SERVICE_VERSION: string = "0.0.1";
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO: number = 5678;
const ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS: number = 5000;
const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: bigint = 1_000_000n;

let grpcClient: BuiltinLedgerGrpcClient;

describe("built-in ledger gRPC service - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
		const authenticationServiceMock: AuthenticationServiceMock = new AuthenticationServiceMock(logger);
		const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		const accountsRepo: IBuiltinLedgerAccountsRepo = new BuiltinLedgerAccountsMemoryRepo(logger);
		const journalEntriesRepo: IBuiltinLedgerJournalEntriesRepo = new BuiltinLedgerJournalEntriesMemoryRepo(logger);

		// Create the hub account, used to credit other accounts.
		const builtinLedgerHubAccount: BuiltinLedgerAccount = {
			id: HUB_ACCOUNT_ID,
			state: "ACTIVE",
			type: "POSITION",
			limitCheckMode: "NONE",
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: 0n,
			creditBalance: HUB_ACCOUNT_INITIAL_CREDIT_BALANCE,
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(builtinLedgerHubAccount);

		await BuiltinLedgerGrpcService.start(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);

		grpcClient = new BuiltinLedgerGrpcClient(
			logger,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO,
			ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS
		);
		await grpcClient.init();
	});

	afterAll(async () => {
		await grpcClient.destroy();
		await BuiltinLedgerGrpcService.stop();
	});

	/* createAccount() */

	test("create non-existent account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output = await grpcClient.createAccounts(
			{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
		);
		const accountId: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
		expect(accountId).not.toBeUndefined();
		expect(accountId).not.toBeNull();
		expect(accountId).not.toEqual("");
	});

	test("create account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: "10",
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		await expect(async () => {
			await grpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
			);
		}).rejects.toThrow();
	});

	test("create account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: "10",
			timestampLastJournalEntry: undefined
		};

		await expect(async () => {
			await grpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
			);
		}).rejects.toThrow();
	});

	test("create account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: 10
		};

		await expect(async () => {
			await grpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
			);
		}).rejects.toThrow();
	});

	test("create account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: "",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		await expect(async () => {
			await grpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
			);
		}).rejects.toThrow();
	});

	test("create account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "some string",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		await expect(async () => {
			await grpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
			);
		}).rejects.toThrow();
	});

	test("create account", async () => {
		const builtinLedgerGrpcAccountOutput: BuiltinLedgerGrpcAccount__Output = {
			id: "abc",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		await grpcClient.createAccounts(
			{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
		);

		await expect(async () => {
			await grpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccountOutput]}
			);
		}).rejects.toThrow();
	});

	/*test("create account with invalid currency decimals", async () => {
		const accountDto: IAccountDto = {
			id: null,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccount(accountDto);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountError.name);
		expect(errorMessage).toEqual((new InvalidCurrencyDecimalsError()).message); // TODO: any other way to get the message?
	});*/

	/* createJournalEntries() */

	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[1].id,
			timestamp: undefined
		};

		// Journal entry B.
		const builtinLedgerGrpcJournalEntryOutputB: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[1].id,
			creditedAccountId: accounts[0].id,
			timestamp: undefined
		};

		const builtinLedgerGrpcIdOutputs = (await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
				builtinLedgerGrpcJournalEntryOutputA,
				builtinLedgerGrpcJournalEntryOutputB
		]})).builtinLedgerGrpcIdArray;

		expect(builtinLedgerGrpcIdOutputs![0].builtinLedgerGrpcId).not.toBeUndefined();
		expect(builtinLedgerGrpcIdOutputs![0].builtinLedgerGrpcId).not.toBeNull();
		expect(builtinLedgerGrpcIdOutputs![0].builtinLedgerGrpcId).not.toEqual("");
		expect(builtinLedgerGrpcIdOutputs![1].builtinLedgerGrpcId).not.toBeUndefined();
		expect(builtinLedgerGrpcIdOutputs![1].builtinLedgerGrpcId).not.toBeNull();
		expect(builtinLedgerGrpcIdOutputs![1].builtinLedgerGrpcId).not.toEqual("");
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[1].id,
			timestamp: 10
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
			]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: "",
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[1].id,
			timestamp: undefined
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
			]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "some string",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[1].id,
			timestamp: undefined
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
				]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "some string",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[1].id,
			timestamp: undefined
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
				]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[0].id,
			timestamp: undefined
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
				]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: "some string",
			creditedAccountId: accounts[1].id,
			timestamp: undefined
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
				]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: undefined,
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: "some string",
			timestamp: undefined
		};

		await expect(async () => {
			(await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
				]})).builtinLedgerGrpcIdArray;
		}).rejects.toThrow();
	});

	test("create journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
			id: "abc",
			ownerId: "test",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: accounts[0].id,
			creditedAccountId: accounts[1].id,
			timestamp: undefined
		};

		await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
				builtinLedgerGrpcJournalEntryOutputA
		]});

		await expect(async () => {
			await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryOutputA
				]});
		}).rejects.toThrow();
	});

	/* getAccountById() */

	test("get non-existent account by id", async () => {
		const accountId: string = randomUUID();
		const x =
			await grpcClient.getAccountsByIds({builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]});
		expect(x).toEqual({});
	});

	/* getJournalEntriesByAccountId() */

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const x =
			await grpcClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: accountId});
		expect(x).toEqual({});
	});

	test("converters", async () => {
		bigintToString(1587n, 2);
	});

	test("converters", async () => {
		bigintToString(1587000n, 2);
	});
});

async function createAndCredit2Accounts(creditBalance: string = "100"): Promise<BuiltinLedgerGrpcAccount__Output[]> {
	// Account A.
	const builtinLedgerGrpcAccountOutputABeforeCrediting: BuiltinLedgerGrpcAccount__Output = {
		id: undefined,
		state: "ACTIVE",
		type: "FEE",
		currencyCode: "EUR",
		debitBalance: undefined,
		creditBalance: undefined,
		timestampLastJournalEntry: undefined
	};

	// Account B.
	const builtinLedgerGrpcAccountOutputBBeforeCrediting: BuiltinLedgerGrpcAccount__Output = {
		id: undefined,
		state: "ACTIVE",
		type: "FEE",
		currencyCode: "EUR",
		debitBalance: undefined,
		creditBalance: undefined,
		timestampLastJournalEntry: undefined
	};

	const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output = await grpcClient.createAccounts(
		{builtinLedgerGrpcAccountArray: [
			builtinLedgerGrpcAccountOutputABeforeCrediting,
			builtinLedgerGrpcAccountOutputBBeforeCrediting
		]}
	);

	const idAccountA: string | undefined
		= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
	const idAccountB: string | undefined
		= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![1].builtinLedgerGrpcId;

	// Journal entry A, regarding the crediting of account A.
	const builtinLedgerGrpcJournalEntryOutputA: BuiltinLedgerGrpcJournalEntry__Output = {
		id: undefined,
		ownerId: "test",
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountA,
		timestamp: undefined
	};

	// Journal entry B, regarding the crediting of account B.
	const builtinLedgerGrpcJournalEntryOutputB: BuiltinLedgerGrpcJournalEntry__Output = {
		id: undefined,
		ownerId: "test",
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountB,
		timestamp: undefined
	};

	await grpcClient.createJournalEntries({builtinLedgerGrpcJournalEntryArray: [
			builtinLedgerGrpcJournalEntryOutputA,
			builtinLedgerGrpcJournalEntryOutputB
	]});

	const builtinLedgerGrpcAccountArrayOutput =
		await grpcClient.getAccountsByIds({builtinLedgerGrpcIdArray:
			[
				{builtinLedgerGrpcId: idAccountA},
				{builtinLedgerGrpcId: idAccountB}
			]
	});

	const accountA = builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray![0];
	const accountB = builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray![1];
	return [accountA!, accountB!];
}
