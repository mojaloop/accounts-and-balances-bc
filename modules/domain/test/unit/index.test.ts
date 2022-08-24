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
	AccountState,
	AccountType,
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
	IAccount,
	IJournalEntry, InvalidCreditBalanceError, InvalidJournalEntryAmountError
} from "../../src";
import {MemoryAccountsRepo} from "./memory_accounts_repo";
import {MemoryJournalEntriesRepo} from "./memory_journal_entries_repo";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {AuditClientMock} from "./audit_client_mock";
import {Account} from "../../src/entities/account";
import {JournalEntry} from "../../src/entities/journal_entry";
import * as uuid from "uuid";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {AuthorizationClientMock} from "./authorization_client_mock";

const DB_HOST: string = "localhost";
const DB_PORT_NO: number = 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "accounts-and-balances";
const ACCOUNTS_COLLECTION_NAME: string = "accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "journal-entries";

let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let aggregate: Aggregate;
const securityContext: CallSecurityContext = { // TODO: verify.
	username: "",
	clientId: "",
	rolesIds: [""],
	accessToken: ""
}

describe("accounts and balances domain - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		const authorizationClient: IAuthorizationClient = new AuthorizationClientMock(logger);
		const auditingClient: IAuditClient = new AuditClientMock(logger);
		accountsRepo = new MemoryAccountsRepo(
			logger,
			DB_URL,
			DB_NAME,
			ACCOUNTS_COLLECTION_NAME
		);
		journalEntriesRepo = new MemoryJournalEntriesRepo(
			logger,
			DB_URL,
			DB_NAME,
			JOURNAL_ENTRIES_COLLECTION_NAME
		);
		aggregate = new Aggregate(
			logger,
			authorizationClient,
			auditingClient,
			accountsRepo,
			journalEntriesRepo
		);
		await aggregate.init();
	});

	afterAll(async () => {
		await aggregate.destroy();
	});

	// Create account.
	test("create non-existent account", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountIdReceived: string = await aggregate.createAccount(account, securityContext);
		expect(accountIdReceived).toEqual(accountId);
	});
	test("create existent account", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		await aggregate.createAccount(account, securityContext);
		await expect(
			async () => {
				await aggregate.createAccount(account, securityContext);
			}
		).rejects.toThrow(AccountAlreadyExistsError);
	});
	test("create account with empty string as id", async () => {
		const accountId: string = "";
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		const accountIdReceived: string = await aggregate.createAccount(account, securityContext);
		expect(accountIdReceived).not.toEqual(accountId); // TODO: makes sense?
	});
	test("create account with invalid credit balance", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			-100n,
			25n,
			0
		);
		await expect(
			async () => {
				await aggregate.createAccount(account, securityContext);
			}
		).rejects.toThrow(InvalidCreditBalanceError);
	});
	test("create account with invalid debit balance", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			-25n,
			0
		);
		await expect(
			async () => {
				await aggregate.createAccount(account, securityContext);
			}
		).rejects.toThrow(InvalidDebitBalanceError);
	});
	test("create account with unexpected accounts repo failure", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = true; // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.createAccount(account, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = false; // TODO: should this be done?
	});

	// Create journal entries.
	test("create non-existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA: IJournalEntry = new JournalEntry(
			idJournalEntryA,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB: IJournalEntry = new JournalEntry(
			idJournalEntryB,
			null,
			null,
			"EUR",
			5n,
			accounts[1].id,
			accounts[0].id,
			0
		);
		const idsJournalEntries: string[] =
			await aggregate.createJournalEntries([journalEntryA, journalEntryB], securityContext);
		expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
	});
	test("create existent journal entries", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA: IJournalEntry = new JournalEntry(
			idJournalEntryA,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB: IJournalEntry = new JournalEntry(
			idJournalEntryB,
			null,
			null,
			"EUR",
			5n,
			accounts[1].id,
			accounts[0].id,
			0
		);
		await aggregate.createJournalEntries([journalEntryA, journalEntryB], securityContext);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntryA, journalEntryB], securityContext);
			}
		).rejects.toThrow(JournalEntryAlreadyExistsError);
	});
	test("create journal entry with empty string as id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = "";
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		const journalEntryIdReceived: string[] = await aggregate.createJournalEntries([journalEntry], securityContext);
		expect(journalEntryIdReceived).not.toEqual(journalEntryId); // TODO: makes sense?
	});
	test("create journal entry with same credited and debited accounts", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[0].id,
			0
		);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(CreditedAndDebitedAccountsAreTheSameError);
	});
	test("create journal entry with non-existent credited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			5n,
			"some string",
			accounts[1].id,
			0
		);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(NoSuchCreditedAccountError);
	});
	test("create journal entry with non-existent debited account", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			"some string",
			0
		);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(NoSuchDebitedAccountError);
	});
	test("create journal entry with different currency", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts(); // Accounts created with EUR.
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"USD",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(CurrenciesDifferError);
	});
	test("create journal entry with exceeding amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			10_000n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(InsufficientBalanceError);
	});
	test("create journal entry with invalid amount", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts(); // Accounts created with 100 credit balance each.
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			-5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(InvalidJournalEntryAmountError);
	});
	test("create journal entry with unexpected journal entries repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		(journalEntriesRepo as MemoryJournalEntriesRepo).unexpectedFailure = true; // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(journalEntriesRepo as MemoryJournalEntriesRepo).unexpectedFailure = false; // TODO: should this be done?
	});
	test("create journal entry with unexpected accounts repo failure", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		const journalEntryId: string = uuid.v4();
		const journalEntry: IJournalEntry = new JournalEntry(
			journalEntryId,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = true; // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.createJournalEntries([journalEntry], securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = false; // TODO: should this be done?
	});

	// Get account by id.
	test("get non-existent account by id", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount | null = await aggregate.getAccountById(accountId, securityContext);
		expect(account).toBeNull();
	});
	test("get existent account by id", async () => {
		const accountId: string = uuid.v4();
		const account: IAccount = new Account(
			accountId,
			null,
			AccountState.ACTIVE,
			AccountType.POSITION,
			"EUR",
			100n,
			25n,
			0
		);
		await aggregate.createAccount(account, securityContext);
		const accountReceived: IAccount | null = await aggregate.getAccountById(accountId, securityContext);
		expect(accountReceived).toEqual(account);
	});
	test("get account with unexpected accounts repo failure", async () => {
		const accountId: string = uuid.v4();
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = true; // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.getAccountById(accountId, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = false; // TODO: should this be done?
	});

	// Get accounts by external id.
	test("get non-existent accounts by external id", async () => {
		const externalId: string = uuid.v4();
		const accounts: IAccount[] = await aggregate.getAccountsByExternalId(externalId, securityContext);
		expect(accounts).toEqual([]);
	});
	test("get existent accounts by external id", async () => {
		const externalId: string = uuid.v4();
		const accounts: IAccount[] = await create2Accounts(externalId, externalId);
		const accountsReceived: IAccount[] = await aggregate.getAccountsByExternalId(externalId, securityContext);
		expect(accountsReceived).toEqual(accounts);
	});
	test("get accounts with unexpected accounts repo failure", async () => {
		const externalId: string = uuid.v4();
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = true; // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.getAccountsByExternalId(externalId, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(accountsRepo as MemoryAccountsRepo).unexpectedFailure = false; // TODO: should this be done?
	});

	// Get journal entries by account id.
	test("get non-existent journal entries by account id", async () => {
		const accountId: string = uuid.v4();
		const journalEntries: IJournalEntry[] = await aggregate.getJournalEntriesByAccountId(accountId, securityContext);
		expect(journalEntries).toEqual([]);
	});
	test("get existent journal entries by account id", async () => {
		// Before creating a journal entry, the respective accounts need to be created.
		const accounts: IAccount[] = await create2Accounts();
		// Journal entry A.
		const idJournalEntryA: string = uuid.v4();
		const journalEntryA: IJournalEntry = new JournalEntry(
			idJournalEntryA,
			null,
			null,
			"EUR",
			5n,
			accounts[0].id,
			accounts[1].id,
			0
		);
		// Journal entry B.
		const idJournalEntryB: string = idJournalEntryA + 1;
		const journalEntryB: IJournalEntry = new JournalEntry(
			idJournalEntryB,
			null,
			null,
			"EUR",
			5n,
			accounts[1].id,
			accounts[0].id,
			0
		);
		await aggregate.createJournalEntries([journalEntryA, journalEntryB], securityContext);
		const journalEntriesReceived: IJournalEntry[] =
			await aggregate.getJournalEntriesByAccountId(accounts[0].id, securityContext);
		expect(journalEntriesReceived).toEqual([journalEntryA, journalEntryB]);
	});
	test("get journal entries with unexpected journal entries repo failure", async () => {
		const accountId: string = uuid.v4();
		(journalEntriesRepo as MemoryJournalEntriesRepo).unexpectedFailure = true; // TODO: should this be done?
		await expect(
			async () => {
				await aggregate.getJournalEntriesByAccountId(accountId, securityContext);
			}
		).rejects.toThrow(); // TODO: check for specific repo error?
		(journalEntriesRepo as MemoryJournalEntriesRepo).unexpectedFailure = false; // TODO: should this be done?
	});
});

async function create2Accounts(
	externalIdAccountA: string | null = null,
	externalIdAccountB: string | null = null
): Promise<IAccount[]> {
	// Account A.
	const idAccountA: string = uuid.v4();
	const accountA: IAccount = new Account(
		idAccountA,
		externalIdAccountA,
		AccountState.ACTIVE,
		AccountType.POSITION,
		"EUR",
		100n,
		25n,
		0
	);
	await aggregate.createAccount(accountA, securityContext);
	// Account B.
	const idAccountB: string = uuid.v4();
	const accountB: IAccount = new Account(
		idAccountB,
		externalIdAccountB,
		AccountState.ACTIVE,
		AccountType.POSITION,
		"EUR",
		100n,
		25n,
		0
	);
	await aggregate.createAccount(accountB, securityContext);
	return [accountA, accountB];
}
