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
	BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcClient,
	BuiltinLedgerGrpcIdArray__Output,
	BuiltinLedgerGrpcJournalEntry,
	BuiltinLedgerGrpcJournalEntryArray__Output,
	UnableToCreateAccountsError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {BuiltinLedgerAccountsMemoryRepo} from "./builtin_ledger_accounts_memory_repo";
import {BuiltinLedgerJournalEntriesMemoryRepo} from "./builtin_ledger_journal_entries_memory_repo";
import {AuthenticationServiceMock} from "./authentication_service_mock";
import {AuthorizationClientMock} from "./authorization_client_mock";
import {AuditClientMock} from "./audit_client_mock";
import {bigintToString, stringToBigint} from "../../src/domain/converters";
import {
	AccountAlreadyExistsError,
	BuiltinLedgerAccount,
	CreditedAccountNotFoundError,
	CurrencyCodesDifferError,
	DebitedAccountNotFoundError,
	IBuiltinLedgerAccountsRepo,
	IBuiltinLedgerJournalEntriesRepo,
	InvalidCreditBalanceError,
	InvalidCurrencyCodeError,
	InvalidDebitBalanceError,
	InvalidIdError,
	InvalidJournalEntryAmountError,
	InvalidTimestampError,
	JournalEntryAlreadyExistsError,
	SameDebitedAndCreditedAccountsError,
	UnauthorizedError
} from "../../src";
import {BuiltinLedgerGrpcService} from "../../src/application/builtin_ledger_grpc_service";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "builtin-ledger-grpc-svc-unit-tests";
const SERVICE_VERSION: string = "0.0.1";

const ACCOUNTS_AND_BALANCES_BUILTIN_LEDGER_GRPC_SVC_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_BUILTIN_LEDGER_GRPC_SVC_PORT_NO: number = 5678;
const ACCOUNTS_AND_BALANCES_BUILTIN_LEDGER_GRPC_CLIENT_TIMEOUT_MS: number = 5_000;

const UNKNOWN_ERROR_MESSAGE: string = "unknown error";

const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: bigint = 1_000_000n;

let authorizationClient: IAuthorizationClient;
let builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
let builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
let builtinLedgerGrpcClient: BuiltinLedgerGrpcClient;

describe("built-in ledger grpc service - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
		new AuthenticationServiceMock(logger); // No reference needed.
		authorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		builtinLedgerAccountsRepo = new BuiltinLedgerAccountsMemoryRepo(logger);
		builtinLedgerJournalEntriesRepo = new BuiltinLedgerJournalEntriesMemoryRepo(logger);

		// Create the hub account, used to credit other accounts.
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

		await BuiltinLedgerGrpcService.start(
			logger,
			authorizationClient,
			auditingClient,
			builtinLedgerAccountsRepo,
			builtinLedgerJournalEntriesRepo
		);

		builtinLedgerGrpcClient = new BuiltinLedgerGrpcClient(
			logger,
			ACCOUNTS_AND_BALANCES_BUILTIN_LEDGER_GRPC_SVC_HOST,
			ACCOUNTS_AND_BALANCES_BUILTIN_LEDGER_GRPC_SVC_PORT_NO,
			ACCOUNTS_AND_BALANCES_BUILTIN_LEDGER_GRPC_CLIENT_TIMEOUT_MS
		);
		await builtinLedgerGrpcClient.init();
	});

	afterAll(async () => {
		await builtinLedgerGrpcClient.destroy();
		await BuiltinLedgerGrpcService.stop();
	});

	/* createAccounts() */

	test("createAccounts() - correct usage, no problems", async () => {
		// Account A.
		const builtinLedgerGrpcAccountA: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		// Account B.
		const builtinLedgerGrpcAccountB: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output
			= await builtinLedgerGrpcClient.createAccounts({
				builtinLedgerGrpcAccountArray: [
					builtinLedgerGrpcAccountA,
					builtinLedgerGrpcAccountB
				]
			}
		);

		expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const idAccountA: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
		const idAccountB: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![1].builtinLedgerGrpcId;

		expect(idAccountA).not.toBeUndefined();
		expect(idAccountA).not.toEqual("");

		expect(idAccountB).not.toBeUndefined();
		expect(idAccountB).not.toEqual("");

		expect(idAccountA).not.toEqual(idAccountB);
	});

	test("createAccounts() - unauthorized", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-undefined debit balance", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: "10",
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidDebitBalanceError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-undefined credit balance", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: "10",
			timestampLastJournalEntry: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidCreditBalanceError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-undefined timestamp", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: 123
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidTimestampError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - empty id string", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: "",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidIdError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-existent currency code", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "some string",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidCurrencyCodeError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - duplicate account", async () => {
		const accountId: string = randomUUID();
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: accountId,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		await builtinLedgerGrpcClient.createAccounts(
			{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
		);

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new AccountAlreadyExistsError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - accounts repo's storeNewAccount() error", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		jest.spyOn(builtinLedgerAccountsRepo, "storeNewAccount").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createAccounts(
				{builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]}
			);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	/* createJournalEntries() */

	test("createJournalEntries() - correct usage, no problems", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		// Journal entry B.
		const builtinLedgerGrpcJournalEntryB: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "10",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			timestamp: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output
			= await builtinLedgerGrpcClient.createJournalEntries({
			builtinLedgerGrpcJournalEntryArray: [
				builtinLedgerGrpcJournalEntryA,
				builtinLedgerGrpcJournalEntryB
			]
		});

		expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const idJournalEntryA: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
		const idJournalEntryB: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![1].builtinLedgerGrpcId;

		expect(idJournalEntryA).not.toBeUndefined();
		expect(idJournalEntryA).not.toEqual("");

		expect(idJournalEntryB).not.toBeUndefined();
		expect(idJournalEntryB).not.toEqual("");

		expect(idJournalEntryA).not.toEqual(idJournalEntryB);
	});

	test("createJournalEntries() - unauthorized", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: 0
		};

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-undefined timestamp", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: 123
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidTimestampError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - empty id string", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: "",
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidIdError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent currency code", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "some string",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidCurrencyCodeError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "some string",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidJournalEntryAmountError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - same debited and credited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new SameDebitedAndCreditedAccountsError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: "some string",
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new DebitedAccountNotFoundError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: "some string",
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new CreditedAccountNotFoundError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - currency codes differ", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		// The currency code of the following accounts is EUR.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "USD",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new CurrencyCodesDifferError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - duplicate journal entry", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const journalEntryId: string = randomUUID();
		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: journalEntryId,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		await builtinLedgerGrpcClient.createJournalEntries({
			builtinLedgerGrpcJournalEntryArray: [
				builtinLedgerGrpcJournalEntryA
			]
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new JournalEntryAlreadyExistsError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - journal entries repo's storeNewJournalEntry() error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();

		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: builtinLedgerGrpcAccountsOutput[0].id,
			creditedAccountId: builtinLedgerGrpcAccountsOutput[1].id,
			timestamp: undefined
		};

		jest.spyOn(builtinLedgerJournalEntriesRepo, "storeNewJournalEntry").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntryA
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	/* getAccountsByIds() */

	test("getAccountsByIds() - non-existent account", async () => {
		const accountId: string = randomUUID();
		const builtinLedgerGrpcAccountArrayOutput: BuiltinLedgerGrpcAccountArray__Output
			= await builtinLedgerGrpcClient.getAccountsByIds({builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]});
		expect(builtinLedgerGrpcAccountArrayOutput).toEqual({});
	});

	test("getAccountsByIds() - accounts repo's getAccountsByIds() error", async () => {
		const accountId: string = randomUUID();

		jest.spyOn(builtinLedgerAccountsRepo, "getAccountsByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.getAccountsByIds({builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToGetAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	/* getJournalEntriesByAccountId() */

	test("getJournalEntriesByAccountId() - non-existent account", async () => {
		const accountId: string = randomUUID();
		const builtinLedgerGrpcJournalEntryArrayOutput: BuiltinLedgerGrpcJournalEntryArray__Output
			= await builtinLedgerGrpcClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: accountId});
		expect(builtinLedgerGrpcJournalEntryArrayOutput).toEqual({});
	});

	test("getJournalEntriesByAccountId() - journal entries repo's getJournalEntriesByAccountId() error", async () => {
		const accountId: string = randomUUID();

		jest.spyOn(builtinLedgerJournalEntriesRepo, "getJournalEntriesByAccountId").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: accountId});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToGetJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	/* deleteAccountsByIds() */

	test("deleteAccountsByIds() - ", async () => {
		// Account A.
		const builtinLedgerGrpcAccountA: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		// Account B.
		const builtinLedgerGrpcAccountB: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output
			= await builtinLedgerGrpcClient.createAccounts({
				builtinLedgerGrpcAccountArray: [
					builtinLedgerGrpcAccountA,
					builtinLedgerGrpcAccountB
				]
			}
		);

		expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const idAccountA: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
		const idAccountB: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![1].builtinLedgerGrpcId;

		await builtinLedgerGrpcClient.deleteAccountsByIds({
				builtinLedgerGrpcIdArray: [
					{builtinLedgerGrpcId: idAccountA},
					{builtinLedgerGrpcId: idAccountB}
				]
			}
		);

		const builtinLedgerGrpcAccountArrayOutput: BuiltinLedgerGrpcAccountArray__Output
			= await builtinLedgerGrpcClient.getAccountsByIds(
			{
				builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: idAccountA}, {builtinLedgerGrpcId: idAccountB}]
			});

		expect(builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray).not.toBeUndefined();
		const accounts: BuiltinLedgerGrpcAccount__Output[]
			= builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray!;

		expect(accounts.length).toEqual(2);

		expect(accounts[0].id).toEqual(idAccountA);
		expect(accounts[0].state).toEqual("DELETED");
		expect(accounts[0].type).toEqual(builtinLedgerGrpcAccountA.type);
		expect(accounts[0].currencyCode).toEqual(builtinLedgerGrpcAccountA.currencyCode);
		expect(accounts[0].debitBalance).toEqual("0");
		expect(accounts[0].creditBalance).toEqual("0");
		expect(accounts[0].timestampLastJournalEntry).toEqual(builtinLedgerGrpcAccountA.timestampLastJournalEntry);

		expect(accounts[1].id).toEqual(idAccountB);
		expect(accounts[1].state).toEqual("DELETED");
		expect(accounts[1].type).toEqual(builtinLedgerGrpcAccountB.type);
		expect(accounts[1].currencyCode).toEqual(builtinLedgerGrpcAccountB.currencyCode);
		expect(accounts[1].debitBalance).toEqual("0");
		expect(accounts[1].creditBalance).toEqual("0");
		expect(accounts[1].timestampLastJournalEntry).toEqual(builtinLedgerGrpcAccountB.timestampLastJournalEntry);
	});

	/* deactivateAccountsByIds() */

	/* activateAccountsByIds() */

	/* stringToBigint() */

	test("stringToBigint() - \"0\", 2 decimals", async () => {
		expect(stringToBigint("0", 2)).toEqual(0n);
	});

	test("stringToBigint() - \"0.00\", 2 decimals", async () => {
		expect(() => {
			stringToBigint("0.00", 2);
		}).toThrow();
	});

	test("stringToBigint() - \"0.01\", 2 decimals", async () => {
		expect(stringToBigint("0.01", 2)).toEqual(1n);
	});

	test("stringToBigint() - \"100\", 2 decimals", async () => {
		expect(stringToBigint("100", 2)).toEqual(10000n);
	});

	test("stringToBigint() - \"100.00\", 2 decimals", async () => {
		expect(() => {
			stringToBigint("100.00", 2);
		}).toThrow();
	});

	test("stringToBigint() - \"100.01\", 2 decimals", async () => {
		expect(stringToBigint("100.01", 2)).toEqual(10001n);
	});

	test("stringToBigint() - \"100.012\", 2 decimals", async () => {
		expect(() => {
			stringToBigint("100.012", 2);
		}).toThrow();
	});

	test("stringToBigint() - \"100.0123456789\", 2 decimals", async () => {
		expect(() => {
			stringToBigint("100.0123456789", 2);
		}).toThrow();
	});

	/* bigintToString() */

	test("bigintToString() - 0n, 2 decimals", async () => {
		expect(bigintToString(0n, 2)).toEqual("0");
	});

	test("bigintToString() - 10000n, 2 decimals", async () => {
		expect(bigintToString(10000n, 2)).toEqual("100");
	});
});

async function createAndCredit2Accounts(creditBalance: string = "100"): Promise<BuiltinLedgerGrpcAccount__Output[]> {
	// Account A.
	const builtinLedgerGrpcAccountABeforeCrediting: BuiltinLedgerGrpcAccount = {
		id: undefined,
		state: "ACTIVE",
		type: "FEE",
		currencyCode: "EUR",
		debitBalance: undefined,
		creditBalance: undefined,
		timestampLastJournalEntry: undefined
	};

	// Account B.
	const builtinLedgerGrpcAccountBBeforeCrediting: BuiltinLedgerGrpcAccount = {
		id: undefined,
		state: "ACTIVE",
		type: "FEE",
		currencyCode: "EUR",
		debitBalance: undefined,
		creditBalance: undefined,
		timestampLastJournalEntry: undefined
	};

	// Create the accounts.
	const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output
		= await builtinLedgerGrpcClient.createAccounts(
		{
			builtinLedgerGrpcAccountArray: [
				builtinLedgerGrpcAccountABeforeCrediting,
				builtinLedgerGrpcAccountBBeforeCrediting
			]
		}
	);

	expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

	const idAccountA: string | undefined
		= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
	const idAccountB: string | undefined
		= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![1].builtinLedgerGrpcId;

	// Journal entry A, regarding the crediting of account A.
	const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
		id: undefined,
		ownerId: undefined,
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountA,
		timestamp: undefined
	};

	// Journal entry B, regarding the crediting of account B.
	const builtinLedgerGrpcJournalEntryB: BuiltinLedgerGrpcJournalEntry = {
		id: undefined,
		ownerId: undefined,
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountB,
		timestamp: undefined
	};

	// Create the journal entries.
	await builtinLedgerGrpcClient.createJournalEntries({
		builtinLedgerGrpcJournalEntryArray: [
			builtinLedgerGrpcJournalEntryA,
			builtinLedgerGrpcJournalEntryB
		]
	});

	// Get the updated accounts (after crediting).
	const builtinLedgerGrpcAccountArrayOutput: BuiltinLedgerGrpcAccountArray__Output =
		await builtinLedgerGrpcClient.getAccountsByIds({
			builtinLedgerGrpcIdArray:
				[
					{builtinLedgerGrpcId: idAccountA},
					{builtinLedgerGrpcId: idAccountB}
				]
		});

	expect(builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray).not.toBeUndefined();

	const builtinLedgerGrpcAccountAAfterCrediting: BuiltinLedgerGrpcAccount__Output
		= builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray![0];
	const builtinLedgerGrpcAccountBAfterCrediting: BuiltinLedgerGrpcAccount__Output
		= builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray![1];

	return [builtinLedgerGrpcAccountAAfterCrediting, builtinLedgerGrpcAccountBAfterCrediting];
}
