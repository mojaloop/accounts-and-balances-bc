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

import * as uuid from "uuid";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	AuditClientMock, AuthenticationServiceMock,
	AuthorizationClientMock,
	MemoryAccountsRepo, MemoryJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {
	AccountState,
	AccountType,
	IAccountsRepo,
	IJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {AuxiliaryAccountsAndBalancesGrpcClient} from "./auxiliary_accounts_and_balances_grpc_client";
import {start, stop} from "../../src/service";
import {GrpcAccountState} from "../../dist/proto/gen/GrpcAccountState";
import {GrpcAccountType} from "../../dist/proto/gen/GrpcAccountType";

const PROTO_FILE_PATH: string = "/home/goncalogarcia/Documents/Work/Mojaloop/vNext/BoundedContexts/accounts-and-balances-bc/packages/grpc-svc/src/proto/accounts_and_balances.proto"; // TODO: change name.
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST: string = "localhost"; // TODO: change name.
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO: number = 1234; // TODO: change name.

let authorizationClient: IAuthorizationClient;
let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let auxiliaryAccountsAndBalancesGrpcClient: AuxiliaryAccountsAndBalancesGrpcClient;

describe("accounts and balances grpc service - unit tests", () => {
	beforeAll(async () => {
		jest.setTimeout(50000); // TODO: remove.
		const logger: ILogger = new ConsoleLogger();
		const authenticationServiceMock: AuthenticationServiceMock = new AuthenticationServiceMock(logger);
		authorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		accountsRepo = new MemoryAccountsRepo(logger);
		journalEntriesRepo = new MemoryJournalEntriesRepo(logger);
		await start(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);
		auxiliaryAccountsAndBalancesGrpcClient = new AuxiliaryAccountsAndBalancesGrpcClient(
			logger,
			PROTO_FILE_PATH,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST,
			ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO
		);
		await auxiliaryAccountsAndBalancesGrpcClient.init();
	});

	afterAll(async () => {
		await auxiliaryAccountsAndBalancesGrpcClient.destroy();
		await stop();
	});

	test("create non-existent account", async () => {
		const accountId: string = uuid.v4();
		const account = {
			id: accountId,
			externalId: null,
			state: GrpcAccountState.ACTIVE,
			type: GrpcAccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: "0"
		};
		const x: string = await auxiliaryAccountsAndBalancesGrpcClient.createAccount(account);
		expect(x).toEqual(accountId);
	});

	test("create non-existent journal entry", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: any[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accounts[0].id,
			debitedAccountId: accounts[1].id,
			timestamp: "0"
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accounts[1].id,
			debitedAccountId: accounts[0].id,
			timestamp: "0"
		};
		const x: string[] = await auxiliaryAccountsAndBalancesGrpcClient.createJournalEntries(
			[journalEntryA, journalEntryB]
		);
		expect(x).toEqual({"value": [{"value": idJournalEntryA}, {"value": idJournalEntryB}]});
	});

	test("get non-existent account by id", async () => {
		const accountId: string = uuid.v4();
		const x = await auxiliaryAccountsAndBalancesGrpcClient.getAccountById(accountId);
		expect(x).toEqual(null);
	});

	test("get non-existent accounts by external id", async () => {
		const externalId: string = uuid.v4();
		const x =
			await auxiliaryAccountsAndBalancesGrpcClient.getAccountsByExternalId(externalId);
		expect(x).toEqual({"value": []});
	});

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = uuid.v4();
		const x =
			await auxiliaryAccountsAndBalancesGrpcClient.getJournalEntriesByAccountId(accountId);
		expect(x).toEqual({"value": []});
	});
});

async function create2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null
): Promise<any[]> {
	// Account A.
	const idAccountA: string = uuid.v4();
	const accountA = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currency: "EUR",
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: "0"
	};
	await auxiliaryAccountsAndBalancesGrpcClient.createAccount(accountA);
	// Account B.
	const idAccountB: string = idAccountA + 1;
	const accountB = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currency: "EUR",
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: "0"
	};
	await auxiliaryAccountsAndBalancesGrpcClient.createAccount(accountB);
	return [accountA, accountB];
}
