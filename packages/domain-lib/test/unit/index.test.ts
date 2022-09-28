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
	CreditedAndDebitedAccountsAreTheSameError,
	CurrenciesDifferError, InsufficientBalanceError,
	InvalidDebitBalanceError,
	IAccountsRepo,
	IJournalEntriesRepo,
	Aggregate,
	JournalEntryAlreadyExistsError,
	InvalidCreditBalanceError, InvalidJournalEntryAmountError
} from "../../src";
import {
	IAccountDto,
	IJournalEntryDto,
	AccountState,
	AccountType
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import * as Crypto from "crypto";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {
	AuditClientMock,
	AuthorizationClientMock,
	MemoryAccountsRepo,
	MemoryJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-shared-mocks-lib";

let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let aggregate: Aggregate;
const securityContext: CallSecurityContext = { // TODO: verify.
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
	});

	afterAll(async () => {
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string = await aggregate.createAccount(accountDto, securityContext);
		expect(accountIdReceived).toEqual(accountId);
	});
	test("create existent account", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		await aggregate.createAccount(accountDto, securityContext);
		await expect(
			async () => {
				await aggregate.createAccount(accountDto, securityContext);
			}
		).rejects.toThrow(AccountAlreadyExistsError);
	});
	test("create account with empty string as id", async () => {
		const accountId: string = "";
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string = await aggregate.createAccount(accountDto, securityContext);
		expect(accountIdReceived).not.toEqual(accountId); // TODO: makes sense?
	});
	test("create account with invalid credit balance", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "-100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		await expect(
			async () => {
				await aggregate.createAccount(accountDto, securityContext);
			}
		).rejects.toThrow(InvalidCreditBalanceError);
	});
	test("create account with invalid debit balance", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "-25",
			timestampLastJournalEntry: 0
		};
		await expect(
			async () => {
				await aggregate.createAccount(accountDto, securityContext);
			}
		).rejects.toThrow(InvalidDebitBalanceError);
	});
	test("create account with unexpected accounts repo failure", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "-25",
			timestampLastJournalEntry: 0
		};
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true); // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.createAccount(accountDto, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = Crypto.randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id,
			debitedAccountId: accountDtos[0].id,
			timestamp: 0
		};
		const idsJournalEntries: string[] =
			await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});
	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = Crypto.randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id,
			debitedAccountId: accountDtos[0].id,
			timestamp: 0
		};
		await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
			}
		).rejects.toThrow(JournalEntryAlreadyExistsError);
	});
	test("create journal entry with empty string as id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = "";
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		const journalEntryIdReceived: string[] = await aggregate.createJournalEntries([journalEntry], securityContext);
		expect(journalEntryIdReceived).not.toEqual(journalEntryId); // TODO: makes sense?
	});
	test("create journal entry with same credited and debited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[0].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(CreditedAndDebitedAccountsAreTheSameError);
	});
	test("create journal entry with non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: "some string",
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(NoSuchCreditedAccountError);
	});
	test("create journal entry with non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: "some string",
			timestamp: 0
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(NoSuchDebitedAccountError);
	});
	test("create journal entry with different currency", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts(); // Accounts created with EUR.
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "USD",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(CurrenciesDifferError);
	});
	test("create journal entry with exceeding amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "10000",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(InsufficientBalanceError);
	});
	test("create journal entry with invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "-5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(InvalidJournalEntryAmountError);
	});
	test("create journal entry with unexpected journal entries repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(true); // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});
	test("create journal entry with unexpected accounts repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		const journalEntryId: string = Crypto.randomUUID();
		const journalEntry: IJournalEntryDto = {
			id: journalEntryId,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true); // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto | null = await aggregate.getAccountById(accountId, securityContext);
		expect(accountDto).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountId: string = Crypto.randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currency: "EUR",
			creditBalance: "100",
			debitBalance: "25",
			timestampLastJournalEntry: 0
		};
		await aggregate.createAccount(accountDto, securityContext);
		const accountReceived: IAccountDto | null = await aggregate.getAccountById(accountId, securityContext);
		expect(accountReceived).toEqual(accountDto);
	});
	test("get account with unexpected accounts repo failure", async () => {
		const accountId: string = Crypto.randomUUID();
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true); // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.getAccountById(accountId, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = Crypto.randomUUID();
		const accountDtos: IAccountDto[] = await aggregate.getAccountsByExternalId(externalId, securityContext);
		expect(accountDtos).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = Crypto.randomUUID();
		const accountDtos: IAccountDto[] = await create2Accounts(externalId, externalId);
		const accountsReceived: IAccountDto[] = await aggregate.getAccountsByExternalId(externalId, securityContext);
		expect(accountsReceived).toEqual(accountDtos);
	});
	test("get accounts with unexpected accounts repo failure", async () => {
		const externalId: string = Crypto.randomUUID();
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(true); // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.getAccountsByExternalId(externalId, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = Crypto.randomUUID();
		const journalEntryDtos: IJournalEntryDto[] = await aggregate.getJournalEntriesByAccountId(accountId, securityContext);
		expect(journalEntryDtos).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accountDtos: IAccountDto[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = Crypto.randomUUID();
		const journalEntryDtoA: IJournalEntryDto = {
			id: idJournalEntryA,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[0].id,
			debitedAccountId: accountDtos[1].id,
			timestamp: 0
		};
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryDtoB: IJournalEntryDto = {
			id: idJournalEntryB,
			externalId: null,
			externalCategory: null,
			currency: "EUR",
			amount: "5",
			creditedAccountId: accountDtos[1].id,
			debitedAccountId: accountDtos[0].id,
			timestamp: 0
		};
		await aggregate.createJournalEntries([journalEntryDtoA, journalEntryDtoB], securityContext);
		const journalEntryDtosReceived: IJournalEntryDto[] =
			await aggregate.getJournalEntriesByAccountId(accountDtos[0].id, securityContext);
		expect(journalEntryDtosReceived).toEqual([journalEntryDtoA, journalEntryDtoB]);
	});
	test("get journal entries with unexpected journal entries repo failure", async () => {
		const accountId: string = Crypto.randomUUID();
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(true); // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.getJournalEntriesByAccountId(accountId, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(journalEntriesRepo as MemoryJournalEntriesRepo).setUnexpectedFailure(false); // TODO: should this be done?
	});
});

async function create2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null
): Promise<IAccountDto[]> {
	// Account A.
	const idAccountA: string = Crypto.randomUUID();
	const accountDtoA: IAccountDto = {
		id: idAccountA,
		externalId: externalIdAccountA,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currency: "EUR",
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: 0
	};
	await aggregate.createAccount(accountDtoA, securityContext);
	// Account B.
	const idAccountB: string = Crypto.randomUUID();
	const accountDtoB: IAccountDto = {
		id: idAccountB,
		externalId: externalIdAccountB,
		state: AccountState.ACTIVE,
		type: AccountType.POSITION,
		currency: "EUR",
		creditBalance: "100",
		debitBalance: "25",
		timestampLastJournalEntry: 0
	};
	await aggregate.createAccount(accountDtoB, securityContext);
	return [accountDtoA, accountDtoB];
}