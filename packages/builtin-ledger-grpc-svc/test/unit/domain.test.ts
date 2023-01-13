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

import {BuiltinLedgerAggregate} from "../../src/domain/aggregate";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {
	BuiltinLedgerAccount,
	BuiltinLedgerAccountDto,
	IBuiltinLedgerAccountsRepo,
	IBuiltinLedgerJournalEntriesRepo
} from "../../src";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {
	AuditClientMock,
	AuthenticationServiceMock,
	AuthorizationClientMock, BuiltinLedgerAccountsMockRepo, BuiltinLedgerJournalEntriesMockRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {stringToBigint} from "../../src/domain/converters";
import {randomUUID} from "crypto";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import fs from "fs";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "builtin-ledger-grpc-svc-domain-unit-tests";
const SERVICE_VERSION: string = "0.0.1";

const HUB_ACCOUNT_ID: string = randomUUID();
const HUB_ACCOUNT_CURRENCY_DECIMALS: number = 2;
const HUB_ACCOUNT_INITIAL_CREDIT_BALANCE: string = "1000000"; // Currency decimals not taken into consideration.

let logger: ILogger;
let authorizationClient: IAuthorizationClient;
let auditingClient: IAuditClient;
let builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
let builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;

let builtinLedgerAggregate: BuiltinLedgerAggregate;

const securityContext: CallSecurityContext = {
	username: "",
	clientId: "",
	rolesIds: [""],
	accessToken: ""
};

describe("built-in ledger domain - unit tests", () => {
	beforeAll(async () => {
		logger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
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

		builtinLedgerAggregate = new BuiltinLedgerAggregate(
			logger,
			authorizationClient,
			auditingClient,
			builtinLedgerAccountsRepo,
			builtinLedgerJournalEntriesRepo
		);
	});

	afterAll(async () => {
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
		const builtinLedgerAccountDtoA: BuiltinLedgerAccountDto = {
			id: null,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			timestampLastJournalEntry: null
		};

		// Account B.
		const builtinLedgerAccountDtoB: BuiltinLedgerAccountDto = {
			id: null,
			state: "ACTIVE",
			type: "FEE",
			currencyCode: "EUR",
			debitBalance: null,
			creditBalance: null,
			timestampLastJournalEntry: null
		};

		const accountIds: string[] = await builtinLedgerAggregate.createAccounts(
			[builtinLedgerAccountDtoA, builtinLedgerAccountDtoB],
			securityContext
		);

		const idAccountA: string | undefined = accountIds[0];
		const idAccountB: string | undefined = accountIds[1];

		expect(idAccountA).not.toBeUndefined();
		expect(idAccountA).not.toEqual("");

		expect(idAccountB).not.toBeUndefined();
		expect(idAccountB).not.toEqual("");

		expect(idAccountA).not.toEqual(idAccountB);
	});
});
