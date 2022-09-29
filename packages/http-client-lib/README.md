# Accounts and Balances HTTP Client Library

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/accounts-and-balances-bc.svg?style=flat)](https://github.com/mojaloop/accounts-and-balances-bc/commits/main)
[![Git Releases](https://img.shields.io/github/release/mojaloop/accounts-and-balances-bc.svg?style=flat)](https://github.com/mojaloop/accounts-and-balances-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop/accounts-and-balances-bc-http-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/accounts-and-balances-bc-http-client-lib)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/accounts-and-balances-bc-http-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/accounts-and-balances-bc-http-client-lib)
[![CircleCI](https://circleci.com/gh/mojaloop/accounts-and-balances-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/accounts-and-balances-bc)

This is the HTTP client library for the Accounts and Balances bounded context.  
It allows for the following operations:
- **Create account**: create a single account.
- **Create journal entries**: create 1 or more journal entries.
- **Get account by id**: get an account by id.
- **Get accounts by external id**: get all the accounts with a specific external id.
- **Get journal entries by account id**: get all the journal entries with a specific account id - either the credited account id or the debited account id.

## Install
```
npm install @mojaloop/accounts-and-balancs-bc-http-client-lib
```

## Usage

### Configure
```
import {ILogger, ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesHttpClient} from "@mojaloop/accounts-and-balancs-bc-http-client-lib";

const BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE: string = "http://localhost:1234";
const TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT: number = 5_000;
const ACCESS_TOKEN: string = "";

const logger: ILogger = new ConsoleLogger();
const accountsAndBalancesHttpClient: AccountsAndBalancesHttpClient = new AccountsAndBalancesHttpClient(
    logger,
    BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE,
    TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT,
    ACCESS_TOKEN
);
```

### Create Account
```
const accountDto: IAccountDto = {
    id: "a",
	externalId: null,
	state: AccountState.ACTIVE,
	type: AccountType.POSITION,
	currencyCode: "EUR",
	currencyDecimals: 2,
	creditBalance: "100",
	debitBalance: "25",
	timestampLastJournalEntry: 0
};
try {
    const accountIdReceived: string = await accountsAndBalancesHttpClient.createAccount(accountDto);
} catch (e: unknown) {
    logger.error(e);
}
```

### Create Journal Entries
```
// Before creating a journal entry, the respective accounts need to be created.
// Account A.
const accountDtoA: IAccountDto = {
    id: "a",
	externalId: null,
	state: AccountState.ACTIVE,
	type: AccountType.POSITION,
	currencyCode: "EUR",
	currencyDecimals: 2,
	creditBalance: "100",
	debitBalance: "25",
	timestampLastJournalEntry: 0
};
await accountsAndBalancesHttpClient.createAccount(accountDtoA);
// Account B.
const accountDtoB: IAccountDto = {
    id: "b",
	externalId: null,
	state: AccountState.ACTIVE,
	type: AccountType.POSITION,
	currencyCode: "EUR",
	currencyDecimals: 2,
	creditBalance: "100",
	debitBalance: "25",
	timestampLastJournalEntry: 0
};
await accountsAndBalancesHttpClient.createAccount(accountDtoB);
// Journal entry A.
const journalEntryDtoA: IJournalEntryDto = {
	id: "a",
	externalId: null,
	externalCategory: null,
	currencyCode: "EUR",
	currencyDecimals: 2,
	amount: "5",
	creditedAccountId: "a",
	debitedAccountId: "b",
	timestamp: 0
};
// Journal entry B.
const journalEntryDtoA: IJournalEntryDto = {
	id: "b",
	externalId: null,
	externalCategory: null,
	currencyCode: "EUR",
	currencyDecimals: 2,
	amount: "5",
	creditedAccountId: "b",
	debitedAccountId: "a",
	timestamp: 0
};
try {
    const idsJournalEntriesReceived: string[] =
        await accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);
} catch (e: unknown) {
    logger.error(e);
}
```

### Get Account by Id
```
const accountId: string = "a";
try {
    const accountDto: IAccountDto | null = await accountsAndBalancesHttpClient.getAccountById(accountId);
} catch (e: unknown) {
    logger.error(e);
}
```

### Get Accounts by External Id
```
const externalId: string = "a";
try {
    const accountDtos: IAccountDto[] = await accountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
} catch (e: unknown) {
    logger.error(e);
}
```

### Get Journal Entries by Account Id
```
const accountId: string = "a";
try {
    const journalEntryDtos: IJournalEntryDto[] =
        await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId);
} catch (e: unknown) {
    logger.error(e);
}
```

## See Also
- [Accounts and Balances HTTP service](https://github.com/mojaloop/accounts-and-balances-bc/tree/main/packages/http-svc)
