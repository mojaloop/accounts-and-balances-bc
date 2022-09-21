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
import {
    AccountsAndBalancesHttpClient,
    IAccountDTO,
    IJournalEntryDTO
} from "@mojaloop/accounts-and-balancs-bc-http-client-lib";

const BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE: string = "http://localhost:1234";
const ACCESS_TOKEN: string = "";
const TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT: number = 10_000;

const logger: ILogger = new ConsoleLogger();
const accountsAndBalancesHttpClient: AccountsAndBalancesHttpClient = new AccountsAndBalancesHttpClient(
    logger,
    BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE,
    ACCESS_TOKEN,
    TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT
);
```

### Create Account
```
const account: IAccountDTO = {
	id: "a",
	externalId: null,
	state: "ACTIVE",
	type: "POSITION",
	currency: "EUR",
	creditBalance: 100,
	debitBalance: 25,
	timestampLastJournalEntry: 0
}
try {
    const accountIdReceived: string = await accountsAndBalancesHttpClient.createAccount(account);
} catch (e: unknown) {
    logger.error(e);
}
```

### Create Journal Entries
```
// Before creating a journal entry, the respective accounts need to be created.
// Account A.
const accountA: IAccountDTO = {
	id: "a",
	externalId: null,
	state: "ACTIVE",
	type: "POSITION",
	currency: "EUR",
	creditBalance: 100,
	debitBalance: 25,
	timestampLastJournalEntry: 0
};
await accountsAndBalancesHttpClient.createAccount(accountA);
// Account B.
const accountB: IAccountDTO = {
	id: "b",
	externalId: null,
	state: "ACTIVE",
	type: "POSITION",
	currency: "EUR",
	creditBalance: 100,
	debitBalance: 25,
	timestampLastJournalEntry: 0
};
await accountsAndBalancesHttpClient.createAccount(accountB);
// Journal entry A.
const journalEntryA: IJournalEntryDTO = {
	id: "a",
	externalId: null,
	externalCategory: null,
	currency: "EUR",
	amount: 5,
	creditedAccountId: accountA.id,
	debitedAccountId: accountB.id,
	timestamp: 0
}
// Journal entry B.
const journalEntryB: IJournalEntryDTO = {
	id: "b",
	externalId: null,
	externalCategory: null,
	currency: "EUR",
	amount: 5,
	creditedAccountId: accountB.id,
	debitedAccountId: accountA.id,
	timestamp: 0
}
try {
    const idsJournalEntriesReceived: string[] = await accountsAndBalancesHttpClient.createJournalEntries([journalEntryA, journalEntryB]);
} catch (e: unknown) {
    logger.error(e);
}
```

### Get Account by Id
```
const accountId: string = "a";
try {
    const account: IAccountDTO | null = await accountsAndBalancesHttpClient.getAccountById(accountId);
} catch (e: unknown) {
    logger.error(e);
}
```

### Get Accounts by External Id
```
const externalId: string = Date.now().toString();
try {
    const accounts: IAccountDTO[] = await accountsAndBalancesHttpClient.getAccountsByExternalId(externalId);
} catch (e: unknown) {
    logger.error(e);
}
```

### Get Journal Entries by Account Id
```
const accountId: string = Date.now().toString();
try {
    const journalEntries: IJournalEntryDTO[] = await accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId);
} catch (e: unknown) {
    logger.error(e);
}
```

## See Also

- [Accounts and Balances HTTP service](https://github.com/mojaloop/accounts-and-balances-bc/tree/main/packages/http-svc)
