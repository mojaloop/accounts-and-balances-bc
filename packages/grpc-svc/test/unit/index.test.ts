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
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	AuditClientMock, AuthenticationServiceMock,
	AuthorizationClientMock,
	MemoryAccountsRepo, MemoryJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {
	IAccountsRepo,
	IJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {AuxiliaryAccountsAndBalancesGrpcClient} from "./auxiliary_accounts_and_balances_grpc_client";
import {startGrpcService, stopGrpcService} from "../../src/service";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST: string = "localhost"; // TODO: change name.
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO: number = 5678; // TODO: change name.

let authorizationClient: IAuthorizationClient;
let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let auxiliaryAccountsAndBalancesGrpcClient: AuxiliaryAccountsAndBalancesGrpcClient;

describe("accounts and balances grpc service - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		const authenticationServiceMock: AuthenticationServiceMock = new AuthenticationServiceMock(logger);
		authorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		accountsRepo = new MemoryAccountsRepo(logger);
		journalEntriesRepo = new MemoryJournalEntriesRepo(logger);
		await startGrpcService(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);
		auxiliaryAccountsAndBalancesGrpcClient = new AuxiliaryAccountsAndBalancesGrpcClient(
			logger,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO
		);
		await auxiliaryAccountsAndBalancesGrpcClient.init();
	});

	afterAll(async () => {
		await auxiliaryAccountsAndBalancesGrpcClient.destroy();
		await stopGrpcService();
	});

	test("create non-existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string = await auxiliaryAccountsAndBalancesGrpcClient.createAccount(accountDto);
		expect(accountIdReceived).toEqual(accountId);
	});

	test("create non-existent journal entry", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: "",
			externalCategory: "",
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: "",
			externalCategory: "",
			currencyCode: "EUR",
			currencyDecimals: 2,
			amount: "5",
			creditedAccountId: accountDtos[1].id,
			debitedAccountId: accountDtos[0].id,
			timestamp: 0
		};
		const idsJournalEntries: string[] = await auxiliaryAccountsAndBalancesGrpcClient.createJournalEntries(
			[journalEntryDtoA, journalEntryDtoB]
		);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});

	test("get non-existent account by id", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto | null = await auxiliaryAccountsAndBalancesGrpcClient.getAccountById(accountId);
		expect(accountDto).toEqual(null);
	});

	test("get non-existent accounts by external id", async () => {
		const externalId: string = randomUUID();
		const accountDtos: IAccountDto[] =
			await auxiliaryAccountsAndBalancesGrpcClient.getAccountsByExternalId(externalId);
		expect(accountDtos).toEqual([]);
	});

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const journalEntryDtos: IJournalEntryDto[] =
			await auxiliaryAccountsAndBalancesGrpcClient.getJournalEntriesByAccountId(accountId);
		expect(journalEntryDtos).toEqual([]);
	});
});

async function create2Accounts(
	externalIdAccountA: string = "",
	externalIdAccountB: string = ""
): Promise<IAccountDto[]> {
	// Account A.
	const idAccountA: string = randomUUID();
	const accountDtoA: IAccountDto = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		currencyDecimals: 2,
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: 0
	};
	await auxiliaryAccountsAndBalancesGrpcClient.createAccount(accountDtoA);
	// Account B.
	const idAccountB: string = idAccountA + 1;
	const accountDtoB: IAccountDto = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		currencyDecimals: 2,
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: 0
	};
	await auxiliaryAccountsAndBalancesGrpcClient.createAccount(accountDtoB);
	return [accountDtoA, accountDtoB];
}
