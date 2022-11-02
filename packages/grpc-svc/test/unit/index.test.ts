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
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	AuditClientMock, AuthenticationServiceMock,
	AuthorizationClientMock,
	MemoryAccountsRepo, MemoryJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {
	IAccountsRepo, InvalidCurrencyDecimalsError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {
	GrpcClient,
	UnableToCreateAccountError
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {GrpcService} from "../../src/grpc_service";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "grpc-svc-unit-tests";
const SERVICE_VERSION: string = "0.0.1";
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO: number = 5678;
const ACCOUNTS_AND_BALANCES_GRPC_CLIENT_TIMEOUT_MS: number = 5000;
const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: string = (1_000_000).toString();

let grpcClient: GrpcClient;

describe("accounts and balances grpc service - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
		const authenticationServiceMock: AuthenticationServiceMock = new AuthenticationServiceMock(logger);
		const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		const accountsRepo: IAccountsRepo = new MemoryAccountsRepo(logger);
		const journalEntriesRepo = new MemoryJournalEntriesRepo(logger);

		// Create the hub account, used to credit other accounts.
		const hubAccountDto: IAccountDto = {
			id: HUB_ACCOUNT_ID,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: HUB_ACCOUNT_INITIAL_CREDIT_BALANCE,
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(hubAccountDto);

		await GrpcService.start(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);

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
		await GrpcService.stop();
	});

	/* createAccount() */

	test("create non-existent account", async () => {
		const accountDto: IAccountDto = {
			id: null,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: null,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		const accountId: string = await grpcClient.createAccount(accountDto);
		expect(accountId).not.toBeNull();
		expect(accountId).not.toEqual("");
	});

	test("create account with invalid currency decimals", async () => {
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
	});

	/* createJournalEntries() */

	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();

		// Journal entry A.
		const journalEntryDtoA: IJournalEntryDto = {
			id: null,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: null,
			amount: "5",
			debitedAccountId: accountDtos[0].id!,
			creditedAccountId: accountDtos[1].id!,
			timestamp: null
		};

		// Journal entry B.
		const journalEntryDtoB: IJournalEntryDto = {
			id: null,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: null,
			amount: "5",
			debitedAccountId: accountDtos[1].id!,
			creditedAccountId: accountDtos[0].id!,
			timestamp: null
		};

		const idsJournalEntries: string[] = await grpcClient
			.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);
		expect(idsJournalEntries[0]).not.toBeNull();
		expect(idsJournalEntries[0]).not.toEqual("");
		expect(idsJournalEntries[1]).not.toBeNull();
		expect(idsJournalEntries[1]).not.toEqual("");
	});

	/* getAccountById() */

	test("get non-existent account by id", async () => {
		const accountId: string = randomUUID();
		const accountDtoReceived: IAccountDto | null =
			await grpcClient.getAccountById(accountId);
		expect(accountDtoReceived).toBeNull();
	});

	/* getAccountsByExternalId() */

	test("get non-existent accounts by external id", async () => {
		const externalId: string = randomUUID();
		const accountDtosReceived: IAccountDto[] =
			await grpcClient.getAccountsByExternalId(externalId);
		expect(accountDtosReceived).toEqual([]);
	});

	/* getJournalEntriesByAccountId() */

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const journalEntryDtosReceived: IJournalEntryDto[] =
			await grpcClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntryDtosReceived).toEqual([]);
	});
});

async function createAndCredit2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null,
	creditBalance: string = "100",
): Promise<IAccountDto[]> {
	// Account A.
	const accountDtoABeforeCrediting: IAccountDto = {
		id: null,
		externalId: externalIdAccountA,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		currencyDecimals: null,
		debitBalance: "0",
		creditBalance: "0",
		timestampLastJournalEntry: null
	};
	const idAccountA: string = await grpcClient.createAccount(accountDtoABeforeCrediting);

	// Account B.
	const accountDtoBBeforeCrediting: IAccountDto = {
		id: null,
		externalId: externalIdAccountB,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		currencyDecimals: null,
		debitBalance: "0",
		creditBalance: "0",
		timestampLastJournalEntry: null
	};
	const idAccountB: string = await grpcClient.createAccount(accountDtoBBeforeCrediting);

	// Journal entry A, regarding the crediting of account A.
	const journalEntryDtoA: IJournalEntryDto = {
		id: null,
		externalId: null,
		externalCategory: null,
		currencyCode: "EUR",
		currencyDecimals: null,
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountA,
		timestamp: null
	};

	// Journal entry B, regarding the crediting of account B.
	const journalEntryDtoB: IJournalEntryDto = {
		id: null,
		externalId: null,
		externalCategory: null,
		currencyCode: "EUR",
		currencyDecimals: null,
		amount: creditBalance,
		debitedAccountId: HUB_ACCOUNT_ID,
		creditedAccountId: idAccountB,
		timestamp: null
	};

	await grpcClient
		.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);

	const accountDtoAAfterCrediting: IAccountDto | null =
		await grpcClient.getAccountById(idAccountA);
	const accountDtoBAfterCrediting: IAccountDto | null =
		await grpcClient.getAccountById(idAccountB);
	return [accountDtoAAfterCrediting!, accountDtoBAfterCrediting!];
}
