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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	AccountAlreadyExistsError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	SameCreditedAndDebitedAccountsError,
	InsufficientBalanceError,
	IAccountsRepo,
	IJournalEntriesRepo,
	Aggregate,
	JournalEntryAlreadyExistsError,
	InvalidJournalEntryAmountError,
	CurrencyCodesDifferError
} from "../../dist";
import {
	IAccountDto,
	IJournalEntryDto,
	AccountState,
	AccountType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {randomUUID} from "crypto";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {
	AuditClientMock,
	AuthorizationClientMock,
	MemoryAccountsRepo,
	MemoryJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";
import {bigintToString, stringToBigint} from "../../src/utils";

const ID_HUB_ACCOUNT: string = randomUUID();
const INITIAL_CREDIT_BALANCE_HUB_ACCOUNT: string = (1_000_000).toString();

let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let aggregate: Aggregate;
const securityContext: CallSecurityContext = {
	username: "",
	clientId: "",
	rolesIds: [""],
	accessToken: ""
};

describe("accounts and balances domain library - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		accountsRepo = new MemoryAccountsRepo(logger);
		journalEntriesRepo = new MemoryJournalEntriesRepo(logger);
		aggregate = new Aggregate(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);

		// Create the hub account that will credit other accounts.
		const hubAccountDto: IAccountDto = {
			id: ID_HUB_ACCOUNT,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			creditBalance: INITIAL_CREDIT_BALANCE_HUB_ACCOUNT,
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(hubAccountDto);
	});

	afterAll(async () => {
	});

	test("main test", async () => {
		// Create 2 accounts, A and B.
		// Account A.
		const idAccountA = randomUUID();
		const accountDtoA: IAccountDto = {
			id: idAccountA,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		const receivedIdAccountA: string = await aggregate.createAccount(accountDtoA, securityContext);
		expect(receivedIdAccountA).toEqual(idAccountA);
		// Account B.
		const idAccountB = randomUUID();
		const accountDtoB: IAccountDto = {
			id: idAccountB,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		const receivedIdAccountB: string = await aggregate.createAccount(accountDtoB, securityContext);
		expect(receivedIdAccountB).toEqual(idAccountB);

		// Credit accounts A and B.
		const initialCreditBalance: string = "100";
		// Journal entry A, regarding the crediting of account A.
		const idJournalEntryA: string = randomUUID();
		const timestampJournalEntryA: null = null;
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: initialCreditBalance,
			creditedAccountId: idAccountA,
			debitedAccountId: ID_HUB_ACCOUNT,
			timestamp: timestampJournalEntryA
		};
		// Journal entry B, regarding the crediting of account B.
		const idJournalEntryB: string = randomUUID();
		const timestampJournalEntryB: null = null;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: initialCreditBalance,
			creditedAccountId: idAccountB,
			debitedAccountId: ID_HUB_ACCOUNT,
			timestamp: timestampJournalEntryB
		};
		const receivedIdsJournalEntriesAAndB: string[] =
			await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
		expect(receivedIdsJournalEntriesAAndB).toEqual([idJournalEntryA, idJournalEntryB]);
		// Verify account A.
		const receivedAccountDtoAAfterJournalEntriesAAndB: IAccountDto | null =
			await aggregate.getAccountById(idAccountA, securityContext);
		expect(receivedAccountDtoAAfterJournalEntriesAAndB?.creditBalance).toEqual(initialCreditBalance);
		expect(receivedAccountDtoAAfterJournalEntriesAAndB?.debitBalance).toEqual("0");
		expect(receivedAccountDtoAAfterJournalEntriesAAndB?.timestampLastJournalEntry).not.toBeNull();
		expect(receivedAccountDtoAAfterJournalEntriesAAndB?.timestampLastJournalEntry).not.toEqual(0);
		// Verify account B.
		const receivedAccountDtoBAfterJournalEntriesAAndB: IAccountDto | null =
			await aggregate.getAccountById(idAccountB, securityContext);
		expect(receivedAccountDtoBAfterJournalEntriesAAndB?.creditBalance).toEqual(initialCreditBalance);
		expect(receivedAccountDtoBAfterJournalEntriesAAndB?.debitBalance).toEqual("0");
		expect(receivedAccountDtoBAfterJournalEntriesAAndB?.timestampLastJournalEntry).not.toBeNull();
		expect(receivedAccountDtoBAfterJournalEntriesAAndB?.timestampLastJournalEntry).not.toEqual(0);

		// Transfer money from account A to B and vice-versa.
		// Journal entry C, regarding the transfer of money from account A to B.
		const idJournalEntryC: string = randomUUID();
		const amountJournalEntryC: string = "5";
		const timestampJournalEntryC: null = null;
		const journalEntryDtoC: IJournalEntryDto = {
			id: idJournalEntryC,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: amountJournalEntryC,
			creditedAccountId: idAccountB,
			debitedAccountId: idAccountA,
			timestamp: timestampJournalEntryC
		};
		// Journal entry D, regarding the transfer of money from account B to A.
		const idJournalEntryD: string = randomUUID();
		const amountJournalEntryD: string = "25";
		const timestampJournalEntryD: null = null;
		const journalEntryDtoD: IJournalEntryDto = {
			id: idJournalEntryD,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: amountJournalEntryD,
			creditedAccountId: idAccountA,
			debitedAccountId: idAccountB,
			timestamp: timestampJournalEntryD
		};
		const receivedIdsJournalEntriesCAndD: string[] =
			await aggregate.createJournalEntries([journalEntryDtoC, journalEntryDtoD], securityContext);
		expect(receivedIdsJournalEntriesCAndD).toEqual([idJournalEntryC, idJournalEntryD]);
		// Verify account A.
		const receivedAccountDtoAAfterJournalEntriesCAndD: IAccountDto | null =
			await aggregate.getAccountById(idAccountA, securityContext);
		expect(receivedAccountDtoAAfterJournalEntriesCAndD?.creditBalance).toEqual(`${
			parseInt(initialCreditBalance)
			+ parseInt(amountJournalEntryD)
		}`);
		expect(receivedAccountDtoAAfterJournalEntriesCAndD?.debitBalance).toEqual(amountJournalEntryC);
		expect(receivedAccountDtoAAfterJournalEntriesCAndD?.timestampLastJournalEntry).not.toBeNull();
		expect(receivedAccountDtoAAfterJournalEntriesCAndD?.timestampLastJournalEntry).not.toEqual(0);
		// Verify account B.
		const receivedAccountDtoBAfterJournalEntriesCAndD: IAccountDto | null =
			await aggregate.getAccountById(idAccountB, securityContext);
		expect(receivedAccountDtoBAfterJournalEntriesCAndD?.creditBalance).toEqual(`${
			parseInt(initialCreditBalance)
			+ parseInt(amountJournalEntryC)
		}`);
		expect(receivedAccountDtoBAfterJournalEntriesCAndD?.debitBalance).toEqual(amountJournalEntryD);
		expect(receivedAccountDtoBAfterJournalEntriesCAndD?.timestampLastJournalEntry).not.toBeNull();
		expect(receivedAccountDtoBAfterJournalEntriesCAndD?.timestampLastJournalEntry).not.toEqual(0);

		// Transfer money from account A to B again.
		// Journal entry E, regarding the transfer of money from account A to B.
		const idJournalEntryE: string = randomUUID();
		const amountJournalEntryE: string = "10";
		const timestampJournalEntryE: null = null;
		const journalEntryDtoE: IJournalEntryDto = {
			id: idJournalEntryE,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: amountJournalEntryE,
			creditedAccountId: idAccountB,
			debitedAccountId: idAccountA,
			timestamp: timestampJournalEntryE
		};
		const receivedIdJournalEntryE: string[] =
			await aggregate.createJournalEntries([journalEntryDtoE], securityContext);
		expect(receivedIdJournalEntryE).toEqual([idJournalEntryE]);
		// Verify account A.
		const receivedAccountDtoAAfterJournalEntryE: IAccountDto | null =
			await aggregate.getAccountById(idAccountA, securityContext);
		expect(receivedAccountDtoAAfterJournalEntryE?.creditBalance).toEqual(`${
			parseInt(initialCreditBalance)
			+ parseInt(amountJournalEntryD)
		}`);
		expect(receivedAccountDtoAAfterJournalEntryE?.debitBalance).toEqual(`${
			parseInt(amountJournalEntryC)
			+ parseInt(amountJournalEntryE)
		}`);
		expect(receivedAccountDtoAAfterJournalEntryE?.timestampLastJournalEntry).not.toBeNull();
		expect(receivedAccountDtoAAfterJournalEntryE?.timestampLastJournalEntry).not.toEqual(0);
		// Verify account B.
		const receivedAccountDtoBAfterJournalEntryE: IAccountDto | null =
			await aggregate.getAccountById(idAccountB, securityContext);
		expect(receivedAccountDtoBAfterJournalEntryE?.creditBalance).toEqual(`${
			parseInt(initialCreditBalance)
			+ parseInt(amountJournalEntryC)
			+ parseInt(amountJournalEntryE)
		}`);
		expect(receivedAccountDtoBAfterJournalEntryE?.debitBalance).toEqual(amountJournalEntryD);
		expect(receivedAccountDtoBAfterJournalEntryE?.timestampLastJournalEntry).not.toBeNull();
		expect(receivedAccountDtoBAfterJournalEntryE?.timestampLastJournalEntry).not.toEqual(0);
	});

	/* Create account. */

	test("create non-existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		const accountIdReceived: string = await aggregate.createAccount(accountDto, securityContext);
		expect(accountIdReceived).toEqual(accountId);
	});

	test("create existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		await aggregate.createAccount(accountDto, securityContext);
		await expect(
			async () => {
				await aggregate.createAccount(accountDto, securityContext);
			}
		).rejects.toThrow(AccountAlreadyExistsError);
	});

	test("create account with null id", async () => {
		const accountId: null = null;
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		const accountIdReceived: string = await aggregate.createAccount(accountDto, securityContext);
		expect(accountIdReceived).not.toBeNull();
		expect(accountIdReceived).not.toEqual("");
	});

	// TODO: change failure implementation.
	test("create account with accounts repo failure", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true);
		await expect(
			async () => {
				await aggregate.createAccount(accountDto, securityContext);
			}
		).rejects.toThrow();
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false);
	});

	/* Create journal entries. */

	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
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
		const idsJournalEntriesReceived: string[] =
			await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
		expect(idsJournalEntriesReceived).toEqual([idJournalEntryA, idJournalEntryB]);
	});

	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
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
		await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
		await expect(
			async () => {
				await aggregate.createJournalEntries(
					[journalEntryDtoA, journalEntryDtoB],
					securityContext
				);
			}
		).rejects.toThrow(JournalEntryAlreadyExistsError);
	});

	test("create journal entry with null id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
		const journalEntryId: null = null;
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
		const journalEntryIdReceived: string[] =
			await aggregate.createJournalEntries([journalEntryDto], securityContext);
		expect(journalEntryIdReceived).not.toBeNull();
		expect(journalEntryIdReceived).not.toEqual("");
	});

	test("create journal entry with same credited and debited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
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
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow(SameCreditedAndDebitedAccountsError);
	});

	test("create journal entry with non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: "",
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow(NoSuchCreditedAccountError);
	});

	test("create journal entry with non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: "",
			timestamp: null
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow(NoSuchDebitedAccountError);
	});

	test("create journal entry with currency code different from its accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts(); // currencyCode = "EUR".
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
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow(CurrencyCodesDifferError);
	});

	test("create journal entry with invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
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
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow(InvalidJournalEntryAmountError);
	});

	test("create journal entry with exceeding amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts(); // creditBalance = 100.
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "1000",
			creditedAccountId: accountDtos[0].id!,
			debitedAccountId: accountDtos[1].id!,
			timestamp: null
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow(InsufficientBalanceError);
	});

	// TODO: change failure implementation.
	test("create journal entry with journal entries repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
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
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(true);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow();
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(false);
	});

	// TODO: change failure implementation.
	test("create journal entry with accounts repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
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
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDto], securityContext);
			}
		).rejects.toThrow();
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false);
	});

	/* Get account by id. */

	test("get non-existent account by id", async () => {
		const accountId: string = randomUUID();
		const accountDtoReceived: IAccountDto | null = await aggregate.getAccountById(accountId, securityContext);
		expect(accountDtoReceived).toBeNull();
	});

	test("get existent account by id", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		await aggregate.createAccount(accountDto, securityContext);
		const accountDtoReceived: IAccountDto | null = await aggregate.getAccountById(accountId, securityContext);
		expect(accountDtoReceived?.id).toEqual(accountDto.id);
		expect(accountDtoReceived?.externalId).toEqual(accountDto.externalId);
		expect(accountDtoReceived?.state).toEqual(accountDto.state);
		expect(accountDtoReceived?.type).toEqual(accountDto.type);
		expect(accountDtoReceived?.currencyCode).toEqual(accountDto.currencyCode);
		expect(accountDtoReceived?.creditBalance).toEqual(accountDto.creditBalance);
		expect(accountDtoReceived?.debitBalance).toEqual(accountDto.debitBalance);
		expect(accountDtoReceived?.timestampLastJournalEntry).toEqual(accountDto.timestampLastJournalEntry);
	});

	// TODO: change failure implementation.
	test("get existent account by id with accounts repo failure", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		await aggregate.createAccount(accountDto, securityContext);
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true);
		await expect(
			async () => {
				await aggregate.getAccountById(accountId, securityContext);
			}
		).rejects.toThrow();
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false);
	});

	/* Get accounts by external id. */

	test("get non-existent accounts by external id", async () => {
		const externalId: string = randomUUID();
		const accountDtosReceived: IAccountDto[] = await aggregate.getAccountsByExternalId(externalId, securityContext);
		expect(accountDtosReceived).toEqual([]);
	});

	test("get existent accounts by external id", async () => {
		const externalId: string = randomUUID();
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts(externalId, externalId);
		const accountDtosReceived: IAccountDto[] = await aggregate.getAccountsByExternalId(externalId, securityContext);
		expect(accountDtosReceived).toEqual(accountDtos);
	});

	// TODO: change failure implementation.
	test("get existent accounts by external id with unexpected accounts repo failure", async () => {
		const externalId: string = randomUUID();
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts(externalId, externalId);
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true);
		await expect(
			async () => {
				await aggregate.getAccountsByExternalId(externalId, securityContext);
			}
		).rejects.toThrow();
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false);
	});

	/* Get journal entries by account id. */

	test("get non-existent journal entries by account id", async () => {
		const accountId: string = randomUUID();
		const journalEntryDtosReceived: IJournalEntryDto[] =
			await aggregate.getJournalEntriesByAccountId(accountId, securityContext);
		expect(journalEntryDtosReceived).toEqual([]);
	});

	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		// Account A.
		const idAccountA: string = randomUUID();
		const accountDtoA: IAccountDto = {
			id: idAccountA,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		await aggregate.createAccount(accountDtoA, securityContext);
		// Account B.
		const idAccountB: string = randomUUID();
		const accountDtoB: IAccountDto = {
			id: idAccountB,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			creditBalance: "0",
			debitBalance: "0",
			timestampLastJournalEntry: null
		};
		await aggregate.createAccount(accountDtoB, securityContext);

		// Journal entry A.
		const idJournalEntryA: string = randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "100",
			creditedAccountId: idAccountA,
			debitedAccountId: ID_HUB_ACCOUNT,
			timestamp: null
		};
		// Journal entry B.
		const idJournalEntryB: string = randomUUID();
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "100",
			creditedAccountId: idAccountB,
			debitedAccountId: ID_HUB_ACCOUNT,
			timestamp: null
		};
		// Journal entry C.
		const idJournalEntryC: string = randomUUID();
		const journalEntryDtoC: IJournalEntryDto = {
			id: idJournalEntryC,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: idAccountA,
			debitedAccountId: idAccountB,
			timestamp: null
		};
		// Journal entry D.
		const idJournalEntryD: string = idJournalEntryA + 1;
		const journalEntryDtoD: IJournalEntryDto = {
			id: idJournalEntryD,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: idAccountB,
			debitedAccountId: idAccountA,
			timestamp: null
		};
		await aggregate.createJournalEntries(
			[journalEntryDtoA, journalEntryDtoB, journalEntryDtoC, journalEntryDtoD],
			securityContext
		);

		const journalEntryDtosReceivedIdAccountA: IJournalEntryDto[] =
			await aggregate.getJournalEntriesByAccountId(idAccountA, securityContext);
		// TODO: simplify.
		// journalEntryDtoA.
		expect(journalEntryDtosReceivedIdAccountA[0].id).toEqual(journalEntryDtoA.id);
		expect(journalEntryDtosReceivedIdAccountA[0].externalId).toEqual(journalEntryDtoA.externalId);
		expect(journalEntryDtosReceivedIdAccountA[0].externalCategory).toEqual(journalEntryDtoA.externalCategory);
		expect(journalEntryDtosReceivedIdAccountA[0].currencyCode).toEqual(journalEntryDtoA.currencyCode);
		expect(journalEntryDtosReceivedIdAccountA[0].amount).toEqual(journalEntryDtoA.amount);
		expect(journalEntryDtosReceivedIdAccountA[0].creditedAccountId).toEqual(journalEntryDtoA.creditedAccountId);
		expect(journalEntryDtosReceivedIdAccountA[0].debitedAccountId).toEqual(journalEntryDtoA.debitedAccountId);
		expect(journalEntryDtosReceivedIdAccountA[0].timestamp).not.toBeNull();
		expect(journalEntryDtosReceivedIdAccountA[0].timestamp).not.toEqual(0);
		// journalEntryDtoC.
		expect(journalEntryDtosReceivedIdAccountA[1].id).toEqual(journalEntryDtoC.id);
		expect(journalEntryDtosReceivedIdAccountA[1].externalId).toEqual(journalEntryDtoC.externalId);
		expect(journalEntryDtosReceivedIdAccountA[1].externalCategory).toEqual(journalEntryDtoC.externalCategory);
		expect(journalEntryDtosReceivedIdAccountA[1].currencyCode).toEqual(journalEntryDtoC.currencyCode);
		expect(journalEntryDtosReceivedIdAccountA[1].amount).toEqual(journalEntryDtoC.amount);
		expect(journalEntryDtosReceivedIdAccountA[1].creditedAccountId).toEqual(journalEntryDtoC.creditedAccountId);
		expect(journalEntryDtosReceivedIdAccountA[1].debitedAccountId).toEqual(journalEntryDtoC.debitedAccountId);
		expect(journalEntryDtosReceivedIdAccountA[1].timestamp).not.toBeNull();
		expect(journalEntryDtosReceivedIdAccountA[1].timestamp).not.toEqual(0);
		// journalEntryDtoD.
		expect(journalEntryDtosReceivedIdAccountA[2].id).toEqual(journalEntryDtoD.id);
		expect(journalEntryDtosReceivedIdAccountA[2].externalId).toEqual(journalEntryDtoD.externalId);
		expect(journalEntryDtosReceivedIdAccountA[2].externalCategory).toEqual(journalEntryDtoD.externalCategory);
		expect(journalEntryDtosReceivedIdAccountA[2].currencyCode).toEqual(journalEntryDtoD.currencyCode);
		expect(journalEntryDtosReceivedIdAccountA[2].amount).toEqual(journalEntryDtoD.amount);
		expect(journalEntryDtosReceivedIdAccountA[2].creditedAccountId).toEqual(journalEntryDtoD.creditedAccountId);
		expect(journalEntryDtosReceivedIdAccountA[2].debitedAccountId).toEqual(journalEntryDtoD.debitedAccountId);
		expect(journalEntryDtosReceivedIdAccountA[2].timestamp).not.toBeNull();
		expect(journalEntryDtosReceivedIdAccountA[2].timestamp).not.toEqual(0);

		const journalEntryDtosReceivedIdAccountB: IJournalEntryDto[] =
			await aggregate.getJournalEntriesByAccountId(idAccountB, securityContext);
		// TODO: simplify.
		// journalEntryDtoB.
		expect(journalEntryDtosReceivedIdAccountB[0].id).toEqual(journalEntryDtoB.id);
		expect(journalEntryDtosReceivedIdAccountB[0].externalId).toEqual(journalEntryDtoB.externalId);
		expect(journalEntryDtosReceivedIdAccountB[0].externalCategory).toEqual(journalEntryDtoB.externalCategory);
		expect(journalEntryDtosReceivedIdAccountB[0].currencyCode).toEqual(journalEntryDtoB.currencyCode);
		expect(journalEntryDtosReceivedIdAccountB[0].amount).toEqual(journalEntryDtoB.amount);
		expect(journalEntryDtosReceivedIdAccountB[0].creditedAccountId).toEqual(journalEntryDtoB.creditedAccountId);
		expect(journalEntryDtosReceivedIdAccountB[0].debitedAccountId).toEqual(journalEntryDtoB.debitedAccountId);
		expect(journalEntryDtosReceivedIdAccountB[0].timestamp).not.toBeNull();
		expect(journalEntryDtosReceivedIdAccountB[0].timestamp).not.toEqual(0);
		// journalEntryDtoC.
		expect(journalEntryDtosReceivedIdAccountB[1].id).toEqual(journalEntryDtoC.id);
		expect(journalEntryDtosReceivedIdAccountB[1].externalId).toEqual(journalEntryDtoC.externalId);
		expect(journalEntryDtosReceivedIdAccountB[1].externalCategory).toEqual(journalEntryDtoC.externalCategory);
		expect(journalEntryDtosReceivedIdAccountB[1].currencyCode).toEqual(journalEntryDtoC.currencyCode);
		expect(journalEntryDtosReceivedIdAccountB[1].amount).toEqual(journalEntryDtoC.amount);
		expect(journalEntryDtosReceivedIdAccountB[1].creditedAccountId).toEqual(journalEntryDtoC.creditedAccountId);
		expect(journalEntryDtosReceivedIdAccountB[1].debitedAccountId).toEqual(journalEntryDtoC.debitedAccountId);
		expect(journalEntryDtosReceivedIdAccountB[1].timestamp).not.toBeNull();
		expect(journalEntryDtosReceivedIdAccountB[1].timestamp).not.toEqual(0);
		// journalEntryDtoD.
		expect(journalEntryDtosReceivedIdAccountB[2].id).toEqual(journalEntryDtoD.id);
		expect(journalEntryDtosReceivedIdAccountB[2].externalId).toEqual(journalEntryDtoD.externalId);
		expect(journalEntryDtosReceivedIdAccountB[2].externalCategory).toEqual(journalEntryDtoD.externalCategory);
		expect(journalEntryDtosReceivedIdAccountB[2].currencyCode).toEqual(journalEntryDtoD.currencyCode);
		expect(journalEntryDtosReceivedIdAccountB[2].amount).toEqual(journalEntryDtoD.amount);
		expect(journalEntryDtosReceivedIdAccountB[2].creditedAccountId).toEqual(journalEntryDtoD.creditedAccountId);
		expect(journalEntryDtosReceivedIdAccountB[2].debitedAccountId).toEqual(journalEntryDtoD.debitedAccountId);
		expect(journalEntryDtosReceivedIdAccountB[2].timestamp).not.toBeNull();
		expect(journalEntryDtosReceivedIdAccountB[2].timestamp).not.toEqual(0);
	});

	// TODO: change failure implementation.
	test("get existent journal entry by account id with journal entries repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await createAndCredit2Accounts();
		const idAccountA: string = accountDtos[0].id!;
		const idAccountB: string = accountDtos[1].id!;
		const journalEntryId: string = randomUUID();
		const journalEntryDto: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			amount: "5",
			creditedAccountId: idAccountA,
			debitedAccountId: idAccountB,
			timestamp: null
		};
		await aggregate.createJournalEntries([journalEntryDto], securityContext);
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(true);
		await expect(
			async () => {
				await aggregate.getJournalEntriesByAccountId(idAccountA, securityContext);
			}
		).rejects.toThrow();
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(false);
	});

	/* Converters. */

	test("stringToBigint - \"0\" (2 decimals)", async () => {
		expect(stringToBigint("0", 2)).toEqual(0n);
	});

	test("stringToBigint - \"0.00\" (2 decimals)", async () => {
		expect(() => {
			stringToBigint("0.00", 2);
		}).toThrow();
	});

	test("stringToBigint - \"0.01\" (2 decimals)", async () => {
		expect(stringToBigint("0.01", 2)).toEqual(1n);
	});

	test("stringToBigint - \"100\" (2 decimals)", async () => {
		expect(stringToBigint("100", 2)).toEqual(10000n);
	});

	test("stringToBigint - \"100.00\" (2 decimals)", async () => {
		expect(() => {
			stringToBigint("100.00", 2);
		}).toThrow();
	});

	test("stringToBigint - \"100.01\" (2 decimals)", async () => {
		expect(stringToBigint("100.01", 2)).toEqual(10001n);
	});

	test("stringToBigint - \"100.0123456789\" (2 decimals)", async () => {
		expect(() => {
			stringToBigint("100.0123456789", 2);
		}).toThrow();
	});

	test("bigintToString - 10000n (2 decimals)", async () => {
		expect(bigintToString(10000n, 2)).toEqual("100");
	});
});

async function createAndCredit2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null,
	creditBalance: string = "100",
): Promise<IAccountDto[]> {
	// Account A.
	const idAccountA: string = randomUUID();
	const accountDtoABeforeCrediting: IAccountDto = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		creditBalance: "0",
		debitBalance: "0",
		timestampLastJournalEntry: null
	};
	await aggregate.createAccount(accountDtoABeforeCrediting, securityContext);
	// Account B.
	const idAccountB: string = randomUUID();
	const accountDtoBBeforeCrediting: IAccountDto = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currencyCode: "EUR",
		creditBalance: "0",
		debitBalance: "0",
		timestampLastJournalEntry: null
	};
	await aggregate.createAccount(accountDtoBBeforeCrediting, securityContext);

	// Journal entry A, regarding the crediting of account A.
	const idJournalEntryA: string = randomUUID();
	const journalEntryDtoA: IJournalEntryDto = {
		id: idJournalEntryA,
		externalId: null,
		externalCategory: null,
		currencyCode: "EUR",
		amount: creditBalance,
		creditedAccountId: idAccountA,
		debitedAccountId: ID_HUB_ACCOUNT,
		timestamp: null
	};
	// Journal entry B, regarding the crediting of account B.
	const idJournalEntryB: string = randomUUID();
	const journalEntryDtoB: IJournalEntryDto = {
		id: idJournalEntryB,
		externalId: null,
		externalCategory: null,
		currencyCode: "EUR",
		amount: creditBalance,
		creditedAccountId: idAccountB,
		debitedAccountId: ID_HUB_ACCOUNT,
		timestamp: null
	};
	await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);

	const accountDtoAAfterCrediting: IAccountDto | null = await aggregate.getAccountById(idAccountA, securityContext);
	const accountDtoBAfterCrediting: IAccountDto | null = await aggregate.getAccountById(idAccountB, securityContext);
	return [accountDtoAAfterCrediting!, accountDtoBAfterCrediting!];
}
