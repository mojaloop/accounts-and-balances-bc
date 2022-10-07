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

import {
	IAccountsRepo,
	IJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {AuxiliaryAccountsAndBalancesHttpClient} from "./auxiliary_accounts_and_balances_http_client";
import {randomUUID} from "crypto";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {
	AuditClientMock,
	AuthenticationServiceMock,
	AuthorizationClientMock,
	MemoryAccountsRepo,
	MemoryJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {startHttpService, stopHttpService} from "../../src/service";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE: string = "http://localhost:1234";
const TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT: number = 5_000;

let authorizationClient: IAuthorizationClient;
let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let auxiliaryAccountsAndBalancesHttpClient: AuxiliaryAccountsAndBalancesHttpClient;

describe("accounts and balances http service - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		const authenticationServiceMock: AuthenticationServiceMock = new AuthenticationServiceMock(logger);
		authorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		accountsRepo = new MemoryAccountsRepo(logger);
		journalEntriesRepo = new MemoryJournalEntriesRepo(logger);
		await startHttpService(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);
		auxiliaryAccountsAndBalancesHttpClient = new AuxiliaryAccountsAndBalancesHttpClient(
			logger,
			BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE,
			TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT,
			AuthenticationServiceMock.VALID_ACCESS_TOKEN
		);
	});

	afterAll(async () => {
		await stopHttpService();
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = randomUUID();
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
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create existent account", async () => {
		const accountId: string = randomUUID();
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
		await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(409);
	});
	test("create account with empty string as id", async () => {
		const accountId: string = "";
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
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create account with invalid credit balance", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "-100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create account with invalid debit balance", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "100",
			debitBalance: "-25",
			timestampLastJournalEntry: 0
		};
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create account with unexpected accounts repo failure", async () => {
		const accountId: string = randomUUID();
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
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true); // TODO: should this be done?
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(500);
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});
	test("create account with invalid access token", async () => {
		const accountId: string = randomUUID();
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
		auxiliaryAccountsAndBalancesHttpClient.setAccessToken("");
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(403);
		auxiliaryAccountsAndBalancesHttpClient.setAccessToken(AuthenticationServiceMock.VALID_ACCESS_TOKEN);
	});
	test("create account without privileges", async () => {
		const accountId: string = randomUUID();
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
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(false); // TODO: should this be done?
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		expect(statusCodeResponse).toEqual(403);
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(true); // TODO: should this be done?
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id!,
			debitedAccountId: accountDtos[0].id!,
			timestamp: null
		};
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries(
			[journalEntryDtoA, journalEntryDtoB]
		);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id!,
			debitedAccountId: accountDtos[0].id!,
			timestamp: null
		};
		await auxiliaryAccountsAndBalancesHttpClient
			.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries(
			[journalEntryDtoA, journalEntryDtoB]
		);
		expect(statusCodeResponse).toEqual(409);
	});
	test("create journal entry with empty string as id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = "";
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(201);
	});
	test("create journal entry with same credited and debited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[0].id!,
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "some string",
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: "some string",
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with different currency", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts(); // Accounts created with EUR.
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "USD",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with exceeding amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts(); // Accounts created with "100" credit balance each.
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "10000",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts(); // Accounts created with "100" credit balance each.
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "-5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(400);
	});
	test("create journal entry with unexpected journal entries repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(true); // TODO: should this be done?
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(500);
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});
	test("create journal entry with unexpected accounts repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true); // TODO: should this be done?
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(500);
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});
	test("create journal entry without privileges", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(false); // TODO: should this be done?
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
		expect(statusCodeResponse).toEqual(403);
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(true); // TODO: should this be done?
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = randomUUID();
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.getAccountById(accountId);
		expect(statusCodeResponse).toEqual(404);
	});
	test("get existent account by id", async () => {
		const accountId: string = randomUUID();
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
		await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto);
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.getAccountById(accountId);
		expect(statusCodeResponse).toEqual(200);
	});
	test("get account by id without privileges", async () => {
		const accountId: string = randomUUID();
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(false); // TODO: should this be done?
		const statusCodeResponse: number = await auxiliaryAccountsAndBalancesHttpClient.getAccountById(accountId);
		expect(statusCodeResponse).toEqual(403);
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(true); // TODO: should this be done?
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = randomUUID();
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
		expect(statusCodeResponse).toEqual(404);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = randomUUID();
		await create2Accounts(externalId, externalId);
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
		expect(statusCodeResponse).toEqual(200);
	});
	test("get accounts by external id without privileges", async () => {
		const externalId: string = randomUUID();
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(false); // TODO: should this be done?
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
		expect(statusCodeResponse).toEqual(403);
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(true); // TODO: should this be done?
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId);
		expect(statusCodeResponse).toEqual(404);
	});
	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id!,
			debitedAccountId: accountDtos[0].id!,
			timestamp: null
		};
		await auxiliaryAccountsAndBalancesHttpClient
			.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountDtos[0].id!);
		expect(statusCodeResponse).toEqual(200);
	});
	test("get journal entries by account id without privileges", async () => {
		const accountId: string = randomUUID();
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(false); // TODO: should this be done?
		const statusCodeResponse: number =
			await auxiliaryAccountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId);
		expect(statusCodeResponse).toEqual(403);
		(authorizationClient as AuthorizationClientMock).setRoleHasPrivilege(true); // TODO: should this be done?
	});
});

async function create2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null
): Promise<IAccountDto[]> {
	// Account A.
	const idAccountA: string = randomUUID();
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
	await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDtoA);
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
	await auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDtoB);
	return [accountDtoA, accountDtoB];
}
