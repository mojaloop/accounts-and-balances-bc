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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	AccountAlreadyExistsError,
	IAccountsRepo,
	NoSuchAccountError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {ElasticAccountsRepo} from "@mojaloop/accounts-and-balances-bc-infrastructure-lib";
import {AccountState, AccountType, IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {resolve} from "path";

const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "elastic-accounts-repo-integration-tests";
const SERVICE_VERSION: string = "0.0.1";
const ELASTIC_HOST: string = "localhost";
const ELASTIC_PORT_NO: number = 9200;
const ELASTIC_TIMEOUT_MS: number = 5000;
const ELASTIC_USERNAME: string = "accounts-and-balances-bc";
const ELASTIC_PASSWORD: string = "123456789";
const ELASTIC_CERT_FILE_RELATIVE_PATH: string = "../../../../certs/elasticsearch_http_ca.crt";
const ELASTIC_ACCOUNTS_INDEX: string = "accounts";

let accountsRepo: IAccountsRepo;

describe("accounts and balances infrastructure library - ElasticAccountsRepo integration tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);
		const elasticCertFileAbsolutePath: string = resolve(__dirname, ELASTIC_CERT_FILE_RELATIVE_PATH);
		accountsRepo = new ElasticAccountsRepo(
			logger,
			ELASTIC_HOST,
			ELASTIC_PORT_NO,
			ELASTIC_TIMEOUT_MS,
			ELASTIC_USERNAME,
			ELASTIC_PASSWORD,
			elasticCertFileAbsolutePath,
			ELASTIC_ACCOUNTS_INDEX
		);
		await accountsRepo.init();
	});

	afterAll(async () => {
		await accountsRepo.destroy();
	});

	/* accountExistsById() */

	test("accountExistsById with non-existent account", async () => {
		const accountId: string = randomUUID();
		const accountExists: boolean = await accountsRepo.accountExistsById(accountId);
		expect(accountExists).toBe(false);
	});

	test("accountExistsById with existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		await accountsRepo.storeNewAccount(accountDto);

		const accountExists: boolean = await accountsRepo.accountExistsById(accountId);
		expect(accountExists).toBe(true);
	});

	/* storeNewAccount() */

	test("storeNewAccount with non-existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		await accountsRepo.storeNewAccount(accountDto);
	});

	test("storeNewAccount with existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		await accountsRepo.storeNewAccount(accountDto);

		await expect(
			async () => {
				await accountsRepo.storeNewAccount(accountDto);
			}
		).rejects.toThrow(AccountAlreadyExistsError);
	});

	/* getAccountById() */

	test("getAccountById with non-existent account", async () => {
		const accountId: string = randomUUID();
		const accountDtoReceived: IAccountDto | null = await accountsRepo.getAccountById(accountId);
		expect(accountDtoReceived).toBeNull();
	});

	test("getAccountById with existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		await accountsRepo.storeNewAccount(accountDto);

		const accountDtoReceived: IAccountDto | null = await accountsRepo.getAccountById(accountId);
		expect(accountDtoReceived).toEqual(accountDto);
	});

	/* getAccountsByExternalId() */

	test("getAccountsByExternalId with non-existent external id", async () => {
		const externalId: string = randomUUID();
		const accountDtosReceived: IAccountDto[] = await accountsRepo.getAccountsByExternalId(externalId);
		expect(accountDtosReceived).toEqual([]);
	});

	test("getAccountsByExternalId with existent external id", async () => {
		const externalId: string = randomUUID();

		const idAccountA: string = randomUUID();
		const accountDtoA: IAccountDto = {
			id: idAccountA,
			externalId: externalId,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(accountDtoA);

		const idAccountB: string = randomUUID();
		const accountDtoB: IAccountDto = {
			id: idAccountB,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(accountDtoB);

		const idAccountC: string = randomUUID();
		const accountDtoC: IAccountDto = {
			id: idAccountC,
			externalId: externalId,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(accountDtoC);

		const idAccountD: string = randomUUID();
		const externalIdAccountD: string = randomUUID();
		const accountDtoD: IAccountDto = {
			id: idAccountD,
			externalId: externalIdAccountD,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};
		await accountsRepo.storeNewAccount(accountDtoD);

		// TODO: why does this test only work with a timeout here?
		await new Promise(resolve => setTimeout(resolve, 1000));

		const accountDtosReceived: IAccountDto[] = await accountsRepo.getAccountsByExternalId(externalId);
		expect(accountDtosReceived).toEqual([accountDtoA, accountDtoC]);
	});

	/* updateAccountDebitBalanceAndTimestampById() */

	test("updateAccountDebitBalanceAndTimestampById with non-existent account", async () => {
		const accountId: string = randomUUID();
		const updatedDebitBalance: string = "100";
		const updatedTimestamp: number = 10;
		await expect(
			async () => {
				await accountsRepo.updateAccountDebitBalanceAndTimestampById(
					accountId,
					updatedDebitBalance,
					updatedTimestamp
				);
			}
		).rejects.toThrow(NoSuchAccountError);
	});

	test("updateAccountDebitBalanceAndTimestampById with existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		await accountsRepo.storeNewAccount(accountDto);

		const updatedDebitBalance: string = "100";
		const updatedTimestamp: number = 10;
		await accountsRepo.updateAccountDebitBalanceAndTimestampById(
			accountId,
			updatedDebitBalance,
			updatedTimestamp
		);

		const accountDtoReceived: IAccountDto | null = await accountsRepo.getAccountById(accountId);
		expect(accountDtoReceived?.id).toEqual(accountDto.id);
		expect(accountDtoReceived?.externalId).toEqual(accountDto.externalId);
		expect(accountDtoReceived?.state).toEqual(accountDto.state);
		expect(accountDtoReceived?.type).toEqual(accountDto.type);
		expect(accountDtoReceived?.currencyCode).toEqual(accountDto.currencyCode);
		expect(accountDtoReceived?.currencyDecimals).toEqual(accountDto.currencyDecimals);
		expect(accountDtoReceived?.debitBalance).toEqual(updatedDebitBalance);
		expect(accountDtoReceived?.creditBalance).toEqual(accountDto.creditBalance);
		expect(accountDtoReceived?.timestampLastJournalEntry).toEqual(updatedTimestamp);
	});

	/* updateAccountCreditBalanceAndTimestampById() */

	test("updateAccountCreditBalanceAndTimestampById with non-existent account", async () => {
		const accountId: string = randomUUID();
		const updatedCreditBalance: string = "100";
		const updatedTimestamp: number = 10;
		await expect(
			async () => {
				await accountsRepo.updateAccountCreditBalanceAndTimestampById(
					accountId,
					updatedCreditBalance,
					updatedTimestamp
				);
			}
		).rejects.toThrow(NoSuchAccountError);
	});

	test("updateAccountCreditBalanceAndTimestampById with existent account", async () => {
		const accountId: string = randomUUID();
		const accountDto: IAccountDto = {
			id: accountId,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: 2,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		};

		await accountsRepo.storeNewAccount(accountDto);

		const updatedCreditBalance: string = "100";
		const updatedTimestamp: number = 10;
		await accountsRepo.updateAccountCreditBalanceAndTimestampById(
			accountId,
			updatedCreditBalance,
			updatedTimestamp
		);

		const accountDtoReceived: IAccountDto | null = await accountsRepo.getAccountById(accountId);
		expect(accountDtoReceived?.id).toEqual(accountDto.id);
		expect(accountDtoReceived?.externalId).toEqual(accountDto.externalId);
		expect(accountDtoReceived?.state).toEqual(accountDto.state);
		expect(accountDtoReceived?.type).toEqual(accountDto.type);
		expect(accountDtoReceived?.currencyCode).toEqual(accountDto.currencyCode);
		expect(accountDtoReceived?.currencyDecimals).toEqual(accountDto.currencyDecimals);
		expect(accountDtoReceived?.debitBalance).toEqual(accountDto.debitBalance);
		expect(accountDtoReceived?.creditBalance).toEqual(updatedCreditBalance);
		expect(accountDtoReceived?.timestampLastJournalEntry).toEqual(updatedTimestamp);
	});
});
