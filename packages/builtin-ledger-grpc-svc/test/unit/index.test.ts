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

import {randomUUID} from "crypto";
import {
	BuiltinLedgerGrpcAccount,
	BuiltinLedgerGrpcAccount__Output,
	BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcClient,
	BuiltinLedgerGrpcIdArray__Output,
	BuiltinLedgerGrpcJournalEntry, BuiltinLedgerGrpcJournalEntry__Output,
	BuiltinLedgerGrpcJournalEntryArray__Output, UnableToActivateAccountsError,
	UnableToCreateAccountsError,
	UnableToCreateJournalEntriesError, UnableToDeactivateAccountsError, UnableToDeleteAccountsError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {
	AuditClientMock,
	AuthenticationServiceMock,
	AuthorizationClientMock,
	BuiltinLedgerAccountsMockRepo,
	BuiltinLedgerJournalEntriesMockRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {
	bigintToString,
	stringToBigint
} from "../../src/domain/converters";
import {
	BuiltinLedgerAccount,
	BLCreditedAccountNotFoundError,
	BLCurrencyCodesDifferError,
	BLDebitedAccountNotFoundError,
	IBuiltinLedgerAccountsRepo,
	IBuiltinLedgerJournalEntriesRepo,
	BLInvalidCreditBalanceError,
	BLInvalidCurrencyCodeError,
	BLInvalidDebitBalanceError,
	BLInvalidIdError,
	BLInvalidJournalEntryAmountError,
	BLInvalidTimestampError,
	BLSameDebitedAndCreditedAccountsError,
	BLUnauthorizedError
} from "../../src/domain";
import {
	BuiltinLedgerGrpcService
} from "../../src/application/builtin_ledger_grpc_svc";
import {BuiltinLedgerAggregate} from "../../src/domain/aggregate";
import fs from "fs";

const BC_NAME: string = "accounts-and-balances-bc";
const SVC_NAME: string = "builtin-ledger-grpc-svc-unit-tests";
const SVC_VERSION: string = "0.0.1";

const BUILTIN_LEDGER_URL: string = "localhost:5678";

const UNKNOWN_ERROR_MESSAGE: string = "unknown error";

const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_CURRENCY_DECIMALS: number = 2;
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: string = "1000000"; // Currency decimals not taken into consideration.

let logger: ILogger;
let authorizationClient: IAuthorizationClient;
let auditingClient: IAuditClient;
let builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
let builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
let builtinLedgerGrpcClient: BuiltinLedgerGrpcClient;

describe("built-in ledger grpc service - unit tests", () => {
	beforeAll(async () => {
		logger = new DefaultLogger(BC_NAME, SVC_NAME, SVC_VERSION);
		new AuthenticationServiceMock(logger); // No reference needed.
		authorizationClient = new AuthorizationClientMock(logger);
		auditingClient = new AuditClientMock(logger);
		builtinLedgerAccountsRepo = new BuiltinLedgerAccountsMockRepo(logger);
		builtinLedgerJournalEntriesRepo = new BuiltinLedgerJournalEntriesMockRepo(logger);

		// Create the hub account, used to credit other accounts.
		const initialCreditBalanceHubAccount: bigint
			= stringToBigint(HUB_ACCOUNT_INITIAL_CREDIT_BALANCE, HUB_ACCOUNT_CURRENCY_DECIMALS);
		const builtinLedgerHubAccount: BuiltinLedgerAccount = {
			id: HUB_ACCOUNT_ID,
			state: "ACTIVE",
			type: "FEE",
			limitCheckMode: "NONE",
			currencyCode: "EUR",
			currencyDecimals: HUB_ACCOUNT_CURRENCY_DECIMALS,
			debitBalance: 0n,
			creditBalance: initialCreditBalanceHubAccount,
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
			BUILTIN_LEDGER_URL
		);
		await builtinLedgerGrpcClient.init();
	});

	afterAll(async () => {
		await builtinLedgerGrpcClient.destroy();
		await BuiltinLedgerGrpcService.stop();
	});

	/* BuiltinLedgerAggregate() */

	test("BuiltinLedgerAggregate() - readFileSync() error", async () => {
		const errorMessage: string = "readFileSync() failed";
		jest.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
			throw new Error(errorMessage);
		});

		await expect(async () => {
			new BuiltinLedgerAggregate(
				logger,
				authorizationClient,
				auditingClient,
				builtinLedgerAccountsRepo,
				builtinLedgerJournalEntriesRepo
			);
		}).rejects.toThrow(errorMessage);
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
		expect(errorMessage).toEqual((new BLUnauthorizedError()).message); // TODO: any other way to get the message?
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
		expect(errorMessage).toEqual((new BLInvalidDebitBalanceError()).message); // TODO: any other way to get the message?
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
		expect(errorMessage).toEqual((new BLInvalidCreditBalanceError()).message); // TODO: any other way to get the message?
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
		expect(errorMessage).toEqual((new BLInvalidTimestampError()).message); // TODO: any other way to get the message?
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
		expect(errorMessage).toEqual((new BLInvalidIdError()).message); // TODO: any other way to get the message?
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
		expect(errorMessage).toEqual((new BLInvalidCurrencyCodeError()).message); // TODO: any other way to get the message?
	});

	// TODO: why does instanceof fail with AccountAlreadyExistsError?
	/*test("createAccounts() - duplicate account", async () => {
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
	});*/

	test("createAccounts() - accounts repo storeNewAccount() error", async () => {
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

	test("createAccounts() - accounts repo storeNewAccount() error", async () => {
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
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		// Journal entry B.
		const builtinLedgerGrpcJournalEntryB: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "10",
			debitedAccountId: idAccountB,
			creditedAccountId: idAccountA,
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
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
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
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLUnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-undefined timestamp", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: 123
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLInvalidTimestampError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - empty id string", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: "",
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLInvalidIdError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent currency code", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "some string",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLInvalidCurrencyCodeError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "some string",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLInvalidJournalEntryAmountError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - same debited and credited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountA,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLSameDebitedAndCreditedAccountsError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: "some string",
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLDebitedAccountNotFoundError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: "some string",
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLCreditedAccountNotFoundError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - currency codes differ", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		// The currency code of the following accounts is EUR.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "USD",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLCurrencyCodesDifferError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - currency decimals differ", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		// EUR has 2 decimals. In order to create EUR accounts with a currencyDecimals value other than 2, the accounts
		// repo has to be used directly.

		const currencyDecimalsAccountsAAndB: number = 4;

		const idAccountA: string = randomUUID();
		const creditBalanceAccountA: bigint = stringToBigint("10", currencyDecimalsAccountsAAndB);
		const builtinLedgerAccountA: BuiltinLedgerAccount = {
			id: idAccountA,
			state: "ACTIVE",
			type: "FEE",
			limitCheckMode: "NONE",
			currencyCode: "EUR",
			currencyDecimals: currencyDecimalsAccountsAAndB,
			debitBalance: 0n,
			creditBalance: creditBalanceAccountA,
			timestampLastJournalEntry: null
		};
		await builtinLedgerAccountsRepo.storeNewAccount(builtinLedgerAccountA);

		const idAccountB: string = randomUUID();
		const builtinLedgerAccountB: BuiltinLedgerAccount = {
			id: idAccountB,
			state: "ACTIVE",
			type: "FEE",
			limitCheckMode: "NONE",
			currencyCode: "EUR",
			currencyDecimals: currencyDecimalsAccountsAAndB,
			debitBalance: 0n,
			creditBalance: 0n,
			timestampLastJournalEntry: null
		};
		await builtinLedgerAccountsRepo.storeNewAccount(builtinLedgerAccountB);

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	// TODO: why does instanceof fail with JournalEntryAlreadyExistsError?
	/*test("createJournalEntries() - duplicate journal entry", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const journalEntryId: string = randomUUID();
		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: journalEntryId,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		await builtinLedgerGrpcClient.createJournalEntries({
			builtinLedgerGrpcJournalEntryArray: [
				builtinLedgerGrpcJournalEntry
			]
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new JournalEntryAlreadyExistsError()).message); // TODO: any other way to get the message?
	});*/

	test("createJournalEntries() - accounts repo getAccountsByIds() error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		jest.spyOn(builtinLedgerAccountsRepo, "getAccountsByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	test("createJournalEntries() - journal entries repo storeNewJournalEntry() error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
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
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	test("createJournalEntries() - accounts repo updateAccountDebitBalanceAndTimestampById() error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		jest.spyOn(builtinLedgerAccountsRepo, "updateAccountDebitBalanceAndTimestampById")
			.mockImplementationOnce(() => {
				throw new Error();
			});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
				]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	test("createJournalEntries() - accounts repo updateAccountCreditBalanceAndTimestampById() error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[] = await createAndCredit2Accounts();
		const idAccountA: string = builtinLedgerGrpcAccountsOutput[0].id!;
		const idAccountB: string = builtinLedgerGrpcAccountsOutput[1].id!;

		const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		jest.spyOn(builtinLedgerAccountsRepo, "updateAccountCreditBalanceAndTimestampById")
			.mockImplementationOnce(() => {
				throw new Error();
			});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.createJournalEntries({
				builtinLedgerGrpcJournalEntryArray: [
					builtinLedgerGrpcJournalEntry
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

	test("getAccountsByIds() - accounts repo getAccountsByIds() error", async () => {
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

	test("getJournalEntriesByAccountId() - correct usage, no problems", async () => {
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

		// Account C.
		const builtinLedgerGrpcAccountC: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcAccountIdArrayOutput: BuiltinLedgerGrpcIdArray__Output
			= await builtinLedgerGrpcClient.createAccounts({
				builtinLedgerGrpcAccountArray: [
					builtinLedgerGrpcAccountA,
					builtinLedgerGrpcAccountB,
					builtinLedgerGrpcAccountC
				]
			}
		);

		expect(builtinLedgerGrpcAccountIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const idAccountA: string | undefined
			= builtinLedgerGrpcAccountIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
		const idAccountB: string | undefined
			= builtinLedgerGrpcAccountIdArrayOutput.builtinLedgerGrpcIdArray![1].builtinLedgerGrpcId;
		const idAccountC: string | undefined
			= builtinLedgerGrpcAccountIdArrayOutput.builtinLedgerGrpcIdArray![2].builtinLedgerGrpcId;

		// Journal entry A.
		const builtinLedgerGrpcJournalEntryA: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: undefined
		};

		// Journal entry B.
		const builtinLedgerGrpcJournalEntryB: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "10",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountC,
			timestamp: undefined
		};

		// Journal entry C.
		const builtinLedgerGrpcJournalEntryC: BuiltinLedgerGrpcJournalEntry = {
			id: undefined,
			ownerId: undefined,
			currencyCode: "EUR",
			amount: "15",
			debitedAccountId: idAccountB,
			creditedAccountId: idAccountA,
			timestamp: undefined
		};

		const builtinLedgerGrpcJournalEntryIdArrayOutput: BuiltinLedgerGrpcIdArray__Output
			= await builtinLedgerGrpcClient.createJournalEntries({
			builtinLedgerGrpcJournalEntryArray: [
				builtinLedgerGrpcJournalEntryA,
				builtinLedgerGrpcJournalEntryB,
				builtinLedgerGrpcJournalEntryC
			]
		});

		expect(builtinLedgerGrpcJournalEntryIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const idJournalEntryA: string | undefined
			= builtinLedgerGrpcJournalEntryIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;
		const idJournalEntryC: string | undefined
			= builtinLedgerGrpcJournalEntryIdArrayOutput.builtinLedgerGrpcIdArray![2].builtinLedgerGrpcId;


		const builtinLedgerGrpcJournalEntryArrayOutput: BuiltinLedgerGrpcJournalEntryArray__Output
			= await builtinLedgerGrpcClient.getJournalEntriesByAccountId(
			{builtinLedgerGrpcId: idAccountB}
		);

		expect(builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray).not.toBeUndefined();

		const builtinLedgerGrpcJournalEntriesOutput: BuiltinLedgerGrpcJournalEntry__Output[]
			= builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray!;

		expect(builtinLedgerGrpcJournalEntriesOutput.length).toEqual(2); // Journal entries A and C.

		expect(builtinLedgerGrpcJournalEntriesOutput[0].id).toEqual(idJournalEntryA);
		expect(builtinLedgerGrpcJournalEntriesOutput[0].ownerId).toEqual(builtinLedgerGrpcJournalEntryA.ownerId);
		expect(builtinLedgerGrpcJournalEntriesOutput[0].currencyCode)
			.toEqual(builtinLedgerGrpcJournalEntryA.currencyCode);
		expect(builtinLedgerGrpcJournalEntriesOutput[0].amount).toEqual(builtinLedgerGrpcJournalEntryA.amount);
		expect(builtinLedgerGrpcJournalEntriesOutput[0].debitedAccountId)
			.toEqual(builtinLedgerGrpcJournalEntryA.debitedAccountId);
		expect(builtinLedgerGrpcJournalEntriesOutput[0].creditedAccountId)
			.toEqual(builtinLedgerGrpcJournalEntryA.creditedAccountId);
		expect(builtinLedgerGrpcJournalEntriesOutput[0].timestamp).not.toBeUndefined();
		expect(builtinLedgerGrpcJournalEntriesOutput[0].timestamp).not.toEqual(0);

		expect(builtinLedgerGrpcJournalEntriesOutput[1].id).toEqual(idJournalEntryC);
		expect(builtinLedgerGrpcJournalEntriesOutput[1].ownerId).toEqual(builtinLedgerGrpcJournalEntryC.ownerId);
		expect(builtinLedgerGrpcJournalEntriesOutput[1].currencyCode)
			.toEqual(builtinLedgerGrpcJournalEntryC.currencyCode);
		expect(builtinLedgerGrpcJournalEntriesOutput[1].amount).toEqual(builtinLedgerGrpcJournalEntryC.amount);
		expect(builtinLedgerGrpcJournalEntriesOutput[1].debitedAccountId)
			.toEqual(builtinLedgerGrpcJournalEntryC.debitedAccountId);
		expect(builtinLedgerGrpcJournalEntriesOutput[1].creditedAccountId)
			.toEqual(builtinLedgerGrpcJournalEntryC.creditedAccountId);
		expect(builtinLedgerGrpcJournalEntriesOutput[1].timestamp).not.toBeUndefined();
		expect(builtinLedgerGrpcJournalEntriesOutput[1].timestamp).not.toEqual(0);
	});

	test("getJournalEntriesByAccountId() - non-existent account", async () => {
		const accountId: string = randomUUID();
		const builtinLedgerGrpcJournalEntryArrayOutput: BuiltinLedgerGrpcJournalEntryArray__Output
			= await builtinLedgerGrpcClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: accountId});
		expect(builtinLedgerGrpcJournalEntryArrayOutput).toEqual({});
	});

	test("getJournalEntriesByAccountId() - journal entries repo getJournalEntriesByAccountId() error", async () => {
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

	test("deleteAccountsByIds() - correct usage, no problems", async () => {
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

	test("deleteAccountsByIds() - accounts repo updateAccountStatesByIds() error", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output = await builtinLedgerGrpcClient
			.createAccounts({builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]});

		expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const accountId: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;

		jest.spyOn(builtinLedgerAccountsRepo, "updateAccountStatesByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.deleteAccountsByIds({
				builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeleteAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	/* deactivateAccountsByIds() */

	test("deactivateAccountsByIds() - accounts repo updateAccountStatesByIds() error", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output = await builtinLedgerGrpcClient
			.createAccounts({builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]});

		expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const accountId: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;

		jest.spyOn(builtinLedgerAccountsRepo, "updateAccountStatesByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.deactivateAccountsByIds({
				builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeactivateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	/* activateAccountsByIds() */

	test("activateAccountsByIds() - accounts repo updateAccountStatesByIds() error", async () => {
		const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
			id: undefined,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		const builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output = await builtinLedgerGrpcClient
			.createAccounts({builtinLedgerGrpcAccountArray: [builtinLedgerGrpcAccount]});

		expect(builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray).not.toBeUndefined();

		const accountId: string | undefined
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray![0].builtinLedgerGrpcId;

		// Accounts can't be inactive when created - deactivateAccountsByIds() has to be used.
		await builtinLedgerGrpcClient.deactivateAccountsByIds(
			{builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]}
		);

		jest.spyOn(builtinLedgerAccountsRepo, "updateAccountStatesByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await builtinLedgerGrpcClient.activateAccountsByIds({
				builtinLedgerGrpcIdArray: [{builtinLedgerGrpcId: accountId}]
			});
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToActivateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

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
