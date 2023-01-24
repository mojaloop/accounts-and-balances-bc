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

import {LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {GrpcClient} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {Account, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {GrpcService} from "@mojaloop/accounts-and-balances-bc-grpc-svc/dist/application/grpc_svc";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {
	BuiltinLedgerAccount,
	IBuiltinLedgerAccountsRepo
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain";
import {
	BuiltinLedgerAccountsMongoRepo
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/implementations/builtin_ledger_accounts_mongo_repo";
import {AuthorizationClientMock} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {
	BuiltinLedgerGrpcService
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/application/builtin_ledger_grpc_svc";
import {IChartOfAccountsRepo} from "@mojaloop/accounts-and-balances-bc-grpc-svc/dist/domain";
import {CoaAccount} from "@mojaloop/accounts-and-balances-bc-grpc-svc/dist/domain/coa_account";
import {
	ChartOfAccountsMongoRepo
} from "@mojaloop/accounts-and-balances-bc-grpc-svc/dist/implementations/chart_of_accounts_mongo_repo";
import {stringToBigint} from "@mojaloop/accounts-and-balances-bc-grpc-svc/dist/domain/converters";

/* ********** Constants Begin ********** */

const BC_NAME: string = "accounts-and-balances-bc";
const SVC_NAME: string = "integration-tests";
const SVC_VERSION: string = "0.0.1";

const KAFKA_URL: string = "localhost:9092";

const LOG_LEVEL: LogLevel = LogLevel.DEBUG;
const KAFKA_LOGS_TOPIC: string = "logs";

const MONGO_URL: string = "mongodb://root:mongoDbPas42@localhost:27017";

const ACCOUNTS_AND_BALANCES_URL: string = "localhost:1234";

// Hub account.
const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_CURRENCY_DECIMALS: number = 2;
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: string = "1000000"; // Currency decimals not taken into consideration.

/* ********** Constants End ********** */

let kafkaLogger: KafkaLogger;
let builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
let chartOfAccountRepo: IChartOfAccountsRepo;
let grpcClient: GrpcClient;

describe("accounts and balances - integration tests with the built-in ledger", () => {
	beforeAll(async () => {
		kafkaLogger = new KafkaLogger(
			BC_NAME,
			SVC_NAME,
			SVC_VERSION,
			{kafkaBrokerList: KAFKA_URL},
			KAFKA_LOGS_TOPIC,
			LOG_LEVEL
		);
		await kafkaLogger.init();

		/*const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(kafkaLogger); // TODO: remove mock.

		builtinLedgerAccountsRepo = new BuiltinLedgerAccountsMongoRepo(
			kafkaLogger,
			MONGO_URL
		);
		await builtinLedgerAccountsRepo.init();

		chartOfAccountRepo = new ChartOfAccountsMongoRepo(
			kafkaLogger,
			MONGO_URL
		);
		await chartOfAccountRepo.init();

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
			internalId: HUB_ACCOUNT_ID,
			externalId: HUB_ACCOUNT_ID,
			ownerId: "test",
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			currencyDecimals: HUB_ACCOUNT_CURRENCY_DECIMALS
		};
		await chartOfAccountRepo.storeAccounts([coaHubAccount]);

		await BuiltinLedgerGrpcService.start(
			kafkaLogger,
			authorizationClient,
			undefined,
			builtinLedgerAccountsRepo
		);*/

		await GrpcService.start(
			kafkaLogger,
			//chartOfAccountRepo
		);

		grpcClient = new GrpcClient(
			kafkaLogger,
			ACCOUNTS_AND_BALANCES_URL
		);
		await grpcClient.init();
	});

	afterAll(async () => {
		await grpcClient.destroy();
		await GrpcService.stop();
		//await BuiltinLedgerGrpcService.stop();
		await kafkaLogger.destroy();
	});

	/* createAccounts() */

	test("createAccounts()", async () => {
		const accountA: Account = {
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

		const accountB: Account = {
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

	/* createJournalEntries() */

	test("createJournalEntries()", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: Account[] = await createAndCredit2Accounts();
		const idAccountA: string = accounts[0].id!;
		const idAccountB: string = accounts[1].id!;

		const journalEntryA: JournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		const journalEntryB: JournalEntry = {
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

	/* getAccountsByIds() */

	test("getAccountsByIds()", async () => {
		const accountA: Account = {
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

		const accountB: Account = {
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

		const accountC: Account = {
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
		const idAccountC: string | undefined = accountIds[2];

		const accounts: Account[] = await grpcClient.getAccountsByIds([idAccountA, idAccountC]);

		expect(accounts.length).toEqual(2); // Accounts A and C.

		const receivedAccountA: Account = accounts[0].id === idAccountA ? accounts[0] : accounts[1];
		const receivedAccountC: Account = accounts[1].id === idAccountC ? accounts[1] : accounts[0];

		expect(receivedAccountA.id).toEqual(idAccountA);
		expect(receivedAccountA.ownerId).toEqual(accountA.ownerId);
		expect(receivedAccountA.state).toEqual(accountA.state);
		expect(receivedAccountA.type).toEqual(accountA.type);
		expect(receivedAccountA.currencyCode).toEqual(accountA.currencyCode);
		expect(receivedAccountA.debitBalance).toEqual("0");
		expect(receivedAccountA.creditBalance).toEqual("0");
		expect(receivedAccountA.balance).toEqual("0");
		expect(receivedAccountA.timestampLastJournalEntry).toEqual(accountA.timestampLastJournalEntry);

		expect(receivedAccountC.id).toEqual(idAccountC);
		expect(receivedAccountC.ownerId).toEqual(accountC.ownerId);
		expect(receivedAccountC.state).toEqual(accountC.state);
		expect(receivedAccountC.type).toEqual(accountC.type);
		expect(receivedAccountC.currencyCode).toEqual(accountC.currencyCode);
		expect(receivedAccountC.debitBalance).toEqual("0");
		expect(receivedAccountC.creditBalance).toEqual("0");
		expect(receivedAccountC.balance).toEqual("0");
		expect(receivedAccountC.timestampLastJournalEntry).toEqual(accountB.timestampLastJournalEntry);
	});

	/* getAccountsByOwnerId() */

	test("getAccountsByOwnerId()", async () => {
		const ownerIdA: string = randomUUID();
		const ownerIdB: string = randomUUID();

		const accountA: Account = {
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

		const accountB: Account = {
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

		const accountC: Account = {
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

		const accounts: Account[] = await grpcClient.getAccountsByOwnerId(ownerIdA);

		expect(accounts.length).toEqual(2); // Accounts A and C.

		const receivedAccountA: Account = accounts[0].id === idAccountA ? accounts[0] : accounts[1];
		const receivedAccountC: Account = accounts[1].id === idAccountC ? accounts[1] : accounts[0];

		expect(receivedAccountA.id).toEqual(idAccountA);
		expect(receivedAccountA.ownerId).toEqual(accountA.ownerId);
		expect(receivedAccountA.state).toEqual(accountA.state);
		expect(receivedAccountA.type).toEqual(accountA.type);
		expect(receivedAccountA.currencyCode).toEqual(accountA.currencyCode);
		expect(receivedAccountA.debitBalance).toEqual("0");
		expect(receivedAccountA.creditBalance).toEqual("0");
		expect(receivedAccountA.balance).toEqual("0");
		expect(receivedAccountA.timestampLastJournalEntry).toEqual(accountA.timestampLastJournalEntry);

		expect(receivedAccountC.id).toEqual(idAccountC);
		expect(receivedAccountC.ownerId).toEqual(accountC.ownerId);
		expect(receivedAccountC.state).toEqual(accountC.state);
		expect(receivedAccountC.type).toEqual(accountC.type);
		expect(receivedAccountC.currencyCode).toEqual(accountC.currencyCode);
		expect(receivedAccountC.debitBalance).toEqual("0");
		expect(receivedAccountC.creditBalance).toEqual("0");
		expect(receivedAccountC.balance).toEqual("0");
		expect(receivedAccountC.timestampLastJournalEntry).toEqual(accountB.timestampLastJournalEntry);
	});

	/* getJournalEntriesByAccountId() */

	test("getJournalEntriesByAccountId()", async () => {
		const accountA: Account = {
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

		const accountB: Account = {
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

		const accountC: Account = {
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

		const journalEntryA: JournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "5",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountB,
			timestamp: null
		};

		const journalEntryB: JournalEntry = {
			id: null,
			ownerId: null,
			currencyCode: "EUR",
			amount: "10",
			debitedAccountId: idAccountA,
			creditedAccountId: idAccountC,
			timestamp: null
		};

		const journalEntryC: JournalEntry = {
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

		const journalEntries: JournalEntry[] = await grpcClient.getJournalEntriesByAccountId(idAccountB);

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
});

async function createAndCredit2Accounts(
	ownerIdAccountA: string = "test",
	ownerIdAccountB: string = "test",
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

	const accountIds: string[]
		= await grpcClient.createAccounts([accountABeforeCrediting, accountBBeforeCrediting]);
	const idAccountA: string | undefined = accountIds[0];
	const idAccountB: string | undefined = accountIds[1];

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

	const accountsAfterCrediting: Account[] = await grpcClient.getAccountsByIds([idAccountA, idAccountB]);
	return accountsAfterCrediting;
}
