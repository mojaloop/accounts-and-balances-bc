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

import {
GrpcBuiltinLedgerClient
} from "../../../builtin-ledger-grpc-client-lib";
import {
	BLAccountNotFoundError,
	BLCreditedAccountNotFoundError,
	BLCurrencyCodesDifferError,
	BLDebitedAccountNotFoundError,
	BLInvalidJournalEntryAmountError,
	BLSameDebitedAndCreditedAccountsError,
} from "../../../builtin-ledger-grpc-svc/src/domain/errors";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";

import {AccountsAndBalancesGrpcClient,} from "../../../grpc-client-lib"

import {AccountsAndBalancesAccount, AcountsAndBalancesJournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {
	UnableToActivateAccountsError,
	UnableToDeactivateAccountsError,
	UnableToDeleteAccountsError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {
	AuditClientMock,
	AuthenticationServiceMock,
	AuthorizationClientMock,
	BuiltinLedgerAccountsMockRepo,
	BuiltinLedgerJournalEntriesMockRepo,
	ChartOfAccountsMockRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {CoaAccount} from "packages/grpc-svc/src/domain/coa_account";
import {IChartOfAccountsRepo} from "packages/grpc-svc/src/domain/infrastructure-types/chart_of_accounts_repo";
import {ChartOfAccountsGrpcService} from "../../src/application/service";
import {bigintToString, stringToBigint} from "../../src/domain/converters";
import {UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {
	AccountAlreadyExistsError,
	InvalidBalanceError,
	InvalidCreditBalanceError,
	InvalidCurrencyCodeError,
	InvalidDebitBalanceError,
	InvalidIdError,
	InvalidOwnerIdError,
	InvalidTimestampError
} from "../../src/domain/errors";
import fs from "fs";
import {AccountsAndBalancesAggregate} from "../../src/domain/aggregate";
import {ILedgerAdapter} from "../../src/domain/infrastructure-types/ledger_adapter";
import {BuiltinLedgerAdapter} from "../../src/implementations";

const ACCOUNTS_AND_BALANCES_URL: string = "localhost:3300";

const BUILTIN_LEDGER_URL: string = "localhost:3350";

const UNKNOWN_ERROR_MESSAGE: string = "unknown error";

const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_CURRENCY_DECIMALS: number = 2;
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: string = "1000000"; // Currency decimals not taken into consideration.

let logger: ILogger;
let authorizationClient: IAuthorizationClient;
let chartOfAccountRepo: IChartOfAccountsRepo;
let ledgerAdapter: ILedgerAdapter;
let grpcClient: AccountsAndBalancesGrpcClient;

describe("accounts and balances grpc service - unit tests with the built-in ledger", () => {
	beforeAll(async () => {
		logger = new ConsoleLogger();
		new AuthenticationServiceMock(logger); // No reference needed.
		authorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		const builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo = new BuiltinLedgerAccountsMockRepo(logger);
		const builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo
			= new BuiltinLedgerJournalEntriesMockRepo(logger);
		chartOfAccountRepo = new ChartOfAccountsMockRepo(logger);
		ledgerAdapter = new BuiltinLedgerAdapter(
			logger,
			BUILTIN_LEDGER_URL
		);

		// Create the hub account, used to credit other accounts, on the built-in ledger.
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

		// Create the hub account, used to credit other accounts, on the main service.
		const coaHubAccount: CoaAccount = {
			id: HUB_ACCOUNT_ID,
			ledgerAccountId: HUB_ACCOUNT_ID,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			currencyDecimals: HUB_ACCOUNT_CURRENCY_DECIMALS
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

		await ChartOfAccountsGrpcService.start(
			logger,
			chartOfAccountRepo,
			ledgerAdapter
		);

		grpcClient = new AccountsAndBalancesGrpcClient(
			logger,
			ACCOUNTS_AND_BALANCES_URL
		);
		await grpcClient.init();
	});

	afterAll(async () => {
		await grpcClient.destroy();
		await GrpcService.stop();
		await BuiltinLedgerGrpcService.stop();
	});

	/* AccountsAndBalancesAggregate() */

	test("AccountsAndBalancesAggregate() - readFileSync() error", async () => {
		const errorMessage: string = "readFileSync() failed";
		jest.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
			throw new Error(errorMessage);
		});

		await expect(async () => {
			new AccountsAndBalancesAggregate(
				logger,
				chartOfAccountRepo,
				ledgerAdapter
			);
		}).rejects.toThrow(errorMessage);
	});

	/* createAccounts() */

	test("createAccounts() - correct usage, no problems", async () => {
		const accountA: AccountsAndBalancesAccount = {
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

		const accountB: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([accountA, accountB]);
		const idAccountA: string | undefined = accountIds[0];
		const idAccountB: string | undefined = accountIds[1];

		expect(idAccountA).not.toBeUndefined();
		expect(idAccountA).not.toEqual("");

		expect(idAccountB).not.toBeUndefined();
		expect(idAccountB).not.toEqual("");

		expect(idAccountA).not.toEqual(idAccountB);
	});

	test("createAccounts() - unauthorized", async () => {
		const account: AccountsAndBalancesAccount = {
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

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - duplicate account", async () => {
		const accountId: string = randomUUID();
		const account: AccountsAndBalancesAccount = {
			id: accountId,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		await grpcClient.createAccounts([account]);

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new AccountAlreadyExistsError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-null debit balance", async () => {
		const account: AccountsAndBalancesAccount = {
			id: null,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: "10",
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidDebitBalanceError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-null credit balance", async () => {
		const account: AccountsAndBalancesAccount = {
			id: null,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: "10",
			balance: null,
			timestampLastJournalEntry: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidCreditBalanceError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-null balance", async () => {
		const account: AccountsAndBalancesAccount = {
			id: null,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: "10",
			timestampLastJournalEntry: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidBalanceError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-null timestamp", async () => {
		const account: AccountsAndBalancesAccount = {
			id: null,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: 123
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidTimestampError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - empty id string", async () => {
		const account: AccountsAndBalancesAccount = {
			id: "",
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidIdError()).message); // TODO: any other way to get the message?
	});

	// TODO: solve "" validation.
	test("createAccounts() - empty owner id string", async () => {
		const account: AccountsAndBalancesAccount = {
			id: null,
			ownerId: "",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidOwnerIdError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - non-existent currency code", async () => {
		const account: AccountsAndBalancesAccount = {
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

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual((new InvalidCurrencyCodeError()).message); // TODO: any other way to get the message?
	});

	test("createAccounts() - ledger adapter non-ledger error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		jest.spyOn(ledgerAdapter, "createAccounts").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createAccounts([account]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
	});

	/* createJournalEntries() */

	test("createJournalEntries() - correct usage, no problems", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntryA: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		const journalEntryB: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountB,
			creditedAccountId: idAccountA,
			timestamp: null
		};

		const journalEntryIds: string[] =
			await grpcClient.createJournalEntries([journalEntryA, journalEntryB]);
		const idJournalEntryA: string | undefined = journalEntryIds[0];
		const idJournalEntryB: string | undefined = journalEntryIds[1];

		expect(idJournalEntryA).not.toBeUndefined();
		expect(idJournalEntryA).not.toEqual("");

		expect(idJournalEntryB).not.toBeUndefined();
		expect(idJournalEntryB).not.toEqual("");

		expect(idJournalEntryA).not.toEqual(idJournalEntryB);
	});

	test("createJournalEntries() - unauthorized", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-null timestamp", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: 123
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidTimestampError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - empty id string", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: "",
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidIdError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - empty owner id string", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: "",
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidOwnerIdError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent currency code", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "some string",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new InvalidCurrencyCodeError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "some string",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLInvalidJournalEntryAmountError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - same debited and credited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountA,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLSameDebitedAndCreditedAccountsError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: "some string",
			creditedAccountId: idAccountB,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLDebitedAccountNotFoundError()).message); // TODO: any other way to get the message?
	});

	test("createJournalEntries() - non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: "some string",
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
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
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "USD",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new BLCurrencyCodesDifferError()).message); // TODO: any other way to get the message?
	});

	// TODO: why does instanceof fail with JournalEntryAlreadyExistsError?
	/*test("createJournalEntries() - duplicate journal entry", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: Account[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntryId: string = randomUUID();
		const journalEntry: JournalEntry = {
			id: journalEntryId,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		await grpcClient.createJournalEntries([journalEntry]);

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual((new JournalEntryAlreadyExistsError()).message); // TODO: any other way to get the message?
	});*/

	test("createJournalEntries() - ledger adapter non-ledger error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		jest.spyOn(ledgerAdapter, "createJournalEntries").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.createJournalEntries([journalEntry]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToCreateJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
	});

	/* getAccountsByIds() */

	test("getAccountsByIds() - non-existent account", async () => {
		const accountId: string = randomUUID();
		const accounts: AccountsAndBalancesAccount[] = await grpcClient.getAccountsByIds([accountId]);
		expect(accounts).toEqual([]);
	});

	test("getAccountsByIds() - ledger error (unauthorized)", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.getAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToGetAccountsError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("getAccountsByIds() - ledger adapter non-ledger error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(ledgerAdapter, "getAccountsByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.getAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToGetAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
	});

	/* getAccountsByOwnerId() */

	test("getAccountsByOwnerId() - correct usage, no problems", async () => {
		const ownerIdA: string = "a";
		const ownerIdB: string = "b";

		const accountA: AccountsAndBalancesAccount = {
			id: null,
			ownerId: ownerIdA,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		const accountB: AccountsAndBalancesAccount = {
			id: null,
			ownerId: ownerIdB,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		const accountC: AccountsAndBalancesAccount = {
			id: null,
			ownerId: ownerIdA,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			balance: null,
			timestampLastJournalEntry: null
		};

		const accountIds: string[] = await grpcClient.createAccounts([accountA, accountB, accountC]);
		const idAccountA: string | undefined = accountIds[0];
		const idAccountC: string | undefined = accountIds[2];

		const accounts: AccountsAndBalancesAccount[] = await grpcClient.getAccountsByOwnerId(ownerIdA);

		expect(accounts.length).toEqual(2); // Accounts A and C.

		expect(accounts[0].id).toEqual(idAccountA);
		expect(accounts[0].ownerId).toEqual(accountA.ownerId);
		expect(accounts[0].state).toEqual(accountA.state);
		expect(accounts[0].type).toEqual(accountA.type);
		expect(accounts[0].currencyCode).toEqual(accountA.currencyCode);
		expect(accounts[0].debitBalance).toEqual("0");
		expect(accounts[0].creditBalance).toEqual("0");
		expect(accounts[0].balance).toEqual("0");
		expect(accounts[0].timestampLastJournalEntry).toEqual(accountA.timestampLastJournalEntry);

		expect(accounts[1].id).toEqual(idAccountC);
		expect(accounts[1].ownerId).toEqual(accountC.ownerId);
		expect(accounts[1].state).toEqual(accountC.state);
		expect(accounts[1].type).toEqual(accountC.type);
		expect(accounts[1].currencyCode).toEqual(accountC.currencyCode);
		expect(accounts[1].debitBalance).toEqual("0");
		expect(accounts[1].creditBalance).toEqual("0");
		expect(accounts[1].balance).toEqual("0");
		expect(accounts[1].timestampLastJournalEntry).toEqual(accountB.timestampLastJournalEntry);
	});

	test("getAccountsByOwnerId() - non-existent owner", async () => {
		const ownerId: string = randomUUID();
		const accounts: AccountsAndBalancesAccount[] = await grpcClient.getAccountsByOwnerId(ownerId);
		expect(accounts).toEqual([]);
	});

	/* getJournalEntriesByAccountId() */

	test("getJournalEntriesByAccountId() - correct usage, no problems", async () => {
		const accountA: AccountsAndBalancesAccount = {
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

		const accountB: AccountsAndBalancesAccount = {
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

		const accountC: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([accountA, accountB, accountC]);
		const idAccountA: string | undefined = accountIds[0];
		const idAccountB: string | undefined = accountIds[1];
		const idAccountC: string | undefined = accountIds[2];

		const journalEntryA: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		const journalEntryB: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "10",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountC,
			timestamp: null
		};

		const journalEntryC: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "15",
			debitedAccountId: idAccountB,
			creditedAccountId: idAccountA,
			timestamp: null
		};

		const journalEntryIds: string[] = await grpcClient.createJournalEntries([journalEntryA, journalEntryB, journalEntryC]);
		const idJournalEntryA: string | undefined = journalEntryIds[0];
		const idJournalEntryC: string | undefined = journalEntryIds[2];

		const journalEntries: AcountsAndBalancesJournalEntry[] = await grpcClient.getJournalEntriesByAccountId(idAccountB);

		expect(journalEntries.length).toEqual(2); // Journal entries A and C.

		expect(journalEntries[0].id).toEqual(idJournalEntryA);
		expect(journalEntries[0].ownerId).toEqual(journalEntryA.ownerId);
		expect(journalEntries[0].currencyCode).toEqual(journalEntryA.currencyCode);
		expect(journalEntries[0].amount).toEqual(journalEntryA.amount);
		expect(journalEntries[0].debitedAccountId).toEqual(journalEntryA.debitedAccountId);
		expect(journalEntries[0].creditedAccountId).toEqual(journalEntryA.creditedAccountId);
		expect(journalEntries[0].timestamp).not.toBeNull();
		expect(journalEntries[0].timestamp).not.toEqual(0);

		expect(journalEntries[1].id).toEqual(idJournalEntryC);
		expect(journalEntries[1].ownerId).toEqual(journalEntryC.ownerId);
		expect(journalEntries[1].currencyCode).toEqual(journalEntryC.currencyCode);
		expect(journalEntries[1].amount).toEqual(journalEntryC.amount);
		expect(journalEntries[1].debitedAccountId).toEqual(journalEntryC.debitedAccountId);
		expect(journalEntries[1].creditedAccountId).toEqual(journalEntryC.creditedAccountId);
		expect(journalEntries[1].timestamp).not.toBeNull();
		expect(journalEntries[1].timestamp).not.toEqual(0);
	});

	test("getJournalEntriesByAccountId() - non-existent account", async () => {
		const accountId: string = randomUUID();
		const journalEntries: AcountsAndBalancesJournalEntry[] = await grpcClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntries).toEqual([]);
	});

	test("getJournalEntriesByAccountId() - ledger error (unauthorized)", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		await grpcClient.createJournalEntries([journalEntry]);

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.getJournalEntriesByAccountId(idAccountA);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToGetJournalEntriesError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("getJournalEntriesByAccountId() - ledger adapter non-ledger error", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: AccountsAndBalancesAccount[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntry: AcountsAndBalancesJournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		await grpcClient.createJournalEntries([journalEntry]);

		jest.spyOn(ledgerAdapter, "getJournalEntriesByAccountId").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.getJournalEntriesByAccountId(idAccountA);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToGetJournalEntriesError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
	});

	/* deleteAccountsByIds() */

	test("deleteAccountsByIds() - non-existent account", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(chartOfAccountRepo, "accountsExistByInternalIds").mockImplementationOnce(() => {
			return Promise.resolve(false);
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deleteAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeleteAccountsError.name);
		expect(errorMessage).toEqual((new BLAccountNotFoundError()).message);
	});

	test("deleteAccountsByIds() - chart of accounts repo updateAccountStatesByIds() error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(chartOfAccountRepo, "updateAccountStatesByInternalIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deleteAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeleteAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	test("deleteAccountsByIds() - ledger error (unauthorized)", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deleteAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeleteAccountsError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("deleteAccountsByIds() - ledger adapter non-ledger error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(ledgerAdapter, "deleteAccountsByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deleteAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeleteAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
	});

	/* deactivateAccountsByIds() */

	test("deactivateAccountsByIds() - non-existent account", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(chartOfAccountRepo, "accountsExistByInternalIds").mockImplementationOnce(() => {
			return Promise.resolve(false);
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deactivateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeactivateAccountsError.name);
		expect(errorMessage).toEqual((new BLAccountNotFoundError()).message);
	});

	test("deactivateAccountsByIds() - chart of accounts repo updateAccountStatesByIds() error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(chartOfAccountRepo, "updateAccountStatesByInternalIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deactivateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeactivateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	test("deactivateAccountsByIds() - ledger error (unauthorized)", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deactivateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeactivateAccountsError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("deactivateAccountsByIds() - ledger adapter non-ledger error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		jest.spyOn(ledgerAdapter, "deactivateAccountsByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.deactivateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToDeactivateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
	});

	/* activateAccountsByIds() */

	test("activateAccountsByIds() - non-existent account", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		// Accounts can't be inactive when created - deactivateAccountsByIds() has to be used.
		await grpcClient.deactivateAccountsByIds([accountId]);

		jest.spyOn(chartOfAccountRepo, "accountsExistByInternalIds").mockImplementationOnce(() => {
			return Promise.resolve(false);
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.activateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToActivateAccountsError.name);
		expect(errorMessage).toEqual((new BLAccountNotFoundError()).message);
	});

	test("activateAccountsByIds() - chart of accounts repo updateAccountStatesByIds() error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		// Accounts can't be inactive when created - deactivateAccountsByIds() has to be used.
		await grpcClient.deactivateAccountsByIds([accountId]);

		jest.spyOn(chartOfAccountRepo, "updateAccountStatesByInternalIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.activateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToActivateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE);
	});

	test("activateAccountsByIds() - ledger error (unauthorized)", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		// Accounts can't be inactive when created - deactivateAccountsByIds() has to be used.
		await grpcClient.deactivateAccountsByIds([accountId]);

		jest.spyOn(authorizationClient, "roleHasPrivilege").mockImplementationOnce(() => {
			return false;
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.activateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToActivateAccountsError.name);
		expect(errorMessage).toEqual((new UnauthorizedError()).message); // TODO: any other way to get the message?
	});

	test("activateAccountsByIds() - ledger adapter non-ledger error", async () => {
		const account: AccountsAndBalancesAccount = {
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

		const accountIds: string[] = await grpcClient.createAccounts([account]);
		const accountId: string | undefined = accountIds[0];

		// Accounts can't be inactive when created - deactivateAccountsByIds() has to be used.
		await grpcClient.deactivateAccountsByIds([accountId]);

		jest.spyOn(ledgerAdapter, "reactivateAccountsByIds").mockImplementationOnce(() => {
			throw new Error();
		});

		let errorName: string | undefined;
		let errorMessage: string | undefined;
		try {
			await grpcClient.activateAccountsByIds([accountId]);
		} catch (error: unknown) {
			errorName = error?.constructor.name;
			errorMessage = (error as any)?.message;
		}
		expect(errorName).toEqual(UnableToActivateAccountsError.name);
		expect(errorMessage).toEqual(UNKNOWN_ERROR_MESSAGE); // TODO: any other way to get the message?
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

async function createAndCredit2Accounts(
	ownerIdAccountA: string = "test",
	ownerIdAccountB: string = "test",
	creditBalance: string = "100",
): Promise<AccountsAndBalancesAccount[]> {
	// Account A.
	const accountABeforeCrediting: AccountsAndBalancesAccount = {
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

	// Account B.
	const accountBBeforeCrediting: AccountsAndBalancesAccount = {
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

	const accountIds: string[]
		= await grpcClient.createAccounts([accountABeforeCrediting, accountBBeforeCrediting]);
	const idAccountA: string | undefined = accountIds[0];
	const idAccountB: string | undefined = accountIds[1];

	// Journal entry A, regarding the crediting of account A.
	const journalEntryA: AcountsAndBalancesJournalEntry = {
		id: null,
		ownerId: null,
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountA,
		timestamp: null
	};

	// Journal entry B, regarding the crediting of account B.
	const journalEntryB: AcountsAndBalancesJournalEntry = {
		id: null,
		ownerId: null,
		currencyCode: "EUR",
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountB,
		timestamp: null
	};

	await grpcClient.createJournalEntries([journalEntryA, journalEntryB]);

	const accountsAfterCrediting: AccountsAndBalancesAccount[] = await grpcClient.getAccountsByIds([idAccountA, idAccountB]);
	return accountsAfterCrediting;
}
