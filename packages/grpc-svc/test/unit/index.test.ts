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

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {
	IBuiltinLedgerAccountsRepo,
	IBuiltinLedgerJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain/infrastructure";
import {BuiltinLedgerAccount} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain/entities";
import {BuiltinLedgerGrpcService} from "../../../builtin-ledger-grpc-svc/src/application/builtin_ledger_grpc_service";
import {Account, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {GrpcClient} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {AuthorizationClientMock} from "../../../../test/integration/authorization_client_mock";
import {GrpcService} from "../../src/application/grpc_service";
import {AuthenticationServiceMock} from "./authentication_service_mock";
import {AuditClientMock} from "./audit_client_mock";
import {ChartOfAccountsMemoryRepo} from "./chart_of_accounts_memory_repo";
import {IChartOfAccountsRepo} from "../../src/domain/infrastructure-types/chart_of_accounts_repo";
import {BuiltinLedgerAccountsMemoryRepo} from "./builtin_ledger_accounts_memory_repo";
import {BuiltinLedgerJournalEntriesMemoryRepo} from "./builtin_ledger_journal_entries_memory_repo";
import {CoaAccount} from "../../src/domain/coa_account";
import {bigintToString, stringToBigint} from "../../src/domain/converters";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "grpc-svc-unit-tests";
const SERVICE_VERSION: string = "0.0.1";

const ACCOUNTS_AND_BALANCES_GRPC_SVC_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_GRPC_SVC_PORT_NO: number = 1234;
const ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS: number = 5_000;

const UNKNOWN_ERROR_MESSAGE: string = "unknown error";

const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: bigint = 1_000_000n;

let grpcClient: GrpcClient;

describe("accounts and balances grpc service - unit tests with the built-in ledger", () => {
	beforeAll(async () => {
		const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
		new AuthenticationServiceMock(logger); // No reference needed.
		const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		const builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo = new BuiltinLedgerAccountsMemoryRepo(logger);
		const builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo
			= new BuiltinLedgerJournalEntriesMemoryRepo(logger);
		const chartOfAccountRepo: IChartOfAccountsRepo = new ChartOfAccountsMemoryRepo(logger);

		// Create the hub account, used to credit other accounts, on the built-in ledger.
		const builtinLedgerHubAccount: BuiltinLedgerAccount = {
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
		await builtinLedgerAccountsRepo.storeNewAccount(builtinLedgerHubAccount);

		// Create the hub account, used to credit other accounts, on the main service.
		const coaHubAccount: CoaAccount = {
			internalId: HUB_ACCOUNT_ID,
			externalId: HUB_ACCOUNT_ID,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			currencyDecimals: 2
		};
		await chartOfAccountRepo.storeAccounts([coaHubAccount]);

		// TODO: start this service here or on the main service?
		await BuiltinLedgerGrpcService.start(
			logger,
			authorizationClient,
			auditingClient,
			builtinLedgerAccountsRepo,
			builtinLedgerJournalEntriesRepo
		);

		await GrpcService.start(
			logger,
			chartOfAccountRepo
		);

		grpcClient = new GrpcClient(
			logger,
			ACCOUNTS_AND_BALANCES_GRPC_SVC_HOST,
			ACCOUNTS_AND_BALANCES_GRPC_SVC_PORT_NO,
			ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS
		);
		await grpcClient.init();
	});

	afterAll(async () => {
		await grpcClient.destroy();
		await GrpcService.stop();
		await BuiltinLedgerGrpcService.stop();
	});

	/* createAccounts() */

	test("createAccounts()", async () => {
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

	test("createAccounts()", async () => {
		const id: string = "test_id";
		const account: Account = {
			id: id,
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
		expect(accountId).toEqual(id);
	});

	test("createAccounts()", async () => {
		const id: string = "test_id";
		const account: Account = {
			id: id,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		await expect(async () => {
			await grpcClient.createAccounts([account]);
		}).rejects.toThrow();
	});

	test("createAccounts()", async () => {
		const account: Account = {
			id: null,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "some string",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		await expect(async () => {
			await grpcClient.createAccounts([account]);
		}).rejects.toThrow();
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

	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: Account[] = await createAndCredit2Accounts();

		const journalEntryA: JournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "some string",
			amount: "5",
			debitedAccountId: accounts[0].id!,
			creditedAccountId: accounts[1].id!,
			timestamp: null
		};

		await expect(async () => {
			const idsJournalEntries: string[] =
				await grpcClient.createJournalEntries([journalEntryA]);
		}).rejects.toThrow();
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

	test("get existent accounts by owner id", async () => {
		const ownerId: string = randomUUID();

		// Account A.
		const accountA: Account = {
			id: null,
			ownerId: ownerId,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};
		const idAccountA: string | undefined = (await grpcClient.createAccounts([accountA]))[0];

		// Account B.
		const accountB: Account = {
			id: null,
			ownerId: ownerId,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};
		const idAccountB: string | undefined = (await grpcClient.createAccounts([accountB]))[0];

		const accounts: Account[] = await grpcClient.getAccountsByOwnerId(ownerId);

		expect(accounts[0].id).toEqual(idAccountA);
		expect(accounts[0].ownerId).toEqual(ownerId);
		expect(accounts[0].state).toEqual(accountA.state);
		expect(accounts[0].type).toEqual(accountA.type);
		expect(accounts[0].currencyCode).toEqual(accountA.currencyCode);
		expect(accounts[0].debitBalance).toEqual("0");
		expect(accounts[0].creditBalance).toEqual("0");
		expect(accounts[0].balance).toEqual("0");
		expect(accounts[0].timestampLastJournalEntry).toBeNull();

		expect(accounts[1].id).toEqual(idAccountB);
		expect(accounts[1].ownerId).toEqual(ownerId);
		expect(accounts[1].state).toEqual(accountB.state);
		expect(accounts[1].type).toEqual(accountB.type);
		expect(accounts[1].currencyCode).toEqual(accountB.currencyCode);
		expect(accounts[1].debitBalance).toEqual("0");
		expect(accounts[1].creditBalance).toEqual("0");
		expect(accounts[1].balance).toEqual("0");
		expect(accounts[1].timestampLastJournalEntry).toBeNull();
	});

	/* getJournalEntriesByAccountId() */

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const journalEntries: JournalEntry[] = await grpcClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]);
	});

	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		// Account A.
		const accountA: Account = {
			id: null,
			ownerId: "ownerIdAccountA",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};
		const idAccountA: string | undefined = (await grpcClient.createAccounts([accountA]))[0];

		// Account B.
		const accountB: Account = {
			id: null,
			ownerId: "ownerIdAccountB",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};
		const idAccountB: string | undefined = (await grpcClient.createAccounts([accountB]))[0];

		const journalEntryId: string = randomUUID();
		const journalEntryA: JournalEntry = {
			id: journalEntryId,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		await grpcClient.createJournalEntries([journalEntryA]);

		const journalEntries: JournalEntry[] = await grpcClient.getJournalEntriesByAccountId(idAccountA);

		expect(journalEntries[0].id).toEqual(journalEntryId);
		expect(journalEntries[0].ownerId).toBeNull();
		expect(journalEntries[0].currencyCode).toEqual("EUR");
		expect(journalEntries[0].amount).toEqual("5");
		expect(journalEntries[0].debitedAccountId).toEqual(idAccountA);
		expect(journalEntries[0].creditedAccountId).toEqual(idAccountB);
		expect(journalEntries[0].timestamp).not.toBeNull();
	});

	test("converters", async () => {
		bigintToString(1587n, 2);
	});

	test("converters", async () => {
		bigintToString(1587000n, 2);
	});

	test("converters", async () => {
		await expect(async () => {
			stringToBigint("some string", 2);
		}).rejects.toThrow();
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
