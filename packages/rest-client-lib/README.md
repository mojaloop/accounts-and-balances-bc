# Accounts and Balances REST Client Library

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/accounts-and-balances-bc.svg?style=flat)](https://github.com/mojaloop/accounts-and-balances-bc/commits/main)
[![Git Releases](https://img.shields.io/github/release/mojaloop/accounts-and-balances-bc.svg?style=flat)](https://github.com/mojaloop/accounts-and-balances-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop/accounts-and-balances-bc-rest-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/accounts-and-balances-bc-rest-client-lib)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/accounts-and-balances-bc-rest-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/accounts-and-balances-bc-rest-client-lib)
[![CircleCI](https://circleci.com/gh/mojaloop/accounts-and-balances-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/accounts-and-balances-bc)

This is the REST client library for the Accounts and Balances bounded context.  
It allows for the following operations:
- **Create account**: create a single account.
- **Create journal entries**: create 1 or more journal entries.
- **Get account by id**: get an account by id.
- **Get accounts by external id**: get all the accounts with a specific external id.
- **Get journal entries by account id**: get all the journal entries with a specific account id - either the debited account id or the credited account id.

## Install
```shell
$ npm install @mojaloop/accounts-and-balances-bc-rest-client-lib @mojaloop/logging-bc-client-lib
```

## Usage

### Configure
```typescript
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {RestClient} from "@mojaloop/accounts-and-balances-bc-rest-client-lib";

const BOUNDED_CONTEXT_NAME: string = "some-bc";
const SERVICE_NAME: string = "some-svc";
const SERVICE_VERSION: string = "0.0.1";
const ACCOUNTS_AND_BALANCES_REST_SERVICE_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_REST_SERVICE_PORT_NO: number = 1234;
const ACCOUNTS_AND_BALANCES_REST_CLIENT_TIMEOUT_MS: number = 5000;
const ACCESS_TOKEN: string = "";

const logger: ILogger = new DefaultLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION);

const restClient: RestClient = new RestClient(
    logger,
    ACCOUNTS_AND_BALANCES_REST_SERVICE_HOST,
    ACCOUNTS_AND_BALANCES_REST_SERVICE_PORT_NO,
    ACCOUNTS_AND_BALANCES_REST_CLIENT_TIMEOUT_MS,
    ACCESS_TOKEN
);
```

### Create Account
```typescript
const accountDto: IAccountDto = {
    id: null,
    externalId: null,
    state: AccountState.ACTIVE,
    type: AccountType.POSITION,
    currencyCode: "EUR",
    currencyDecimals: null,
    debitBalance: "0",
    creditBalance: "0",
    timestampLastJournalEntry: null
};

try {
    const accountId: string = await restClient.createAccount(accountDto);
} catch (error: unknown) {
    logger.error(error);
}
```

### Create Journal Entries
```typescript
// Before creating a journal entry, the respective accounts need to be created.

// Account A.
const accountDtoA: IAccountDto = {
    id: null,
    externalId: null,
    state: AccountState.ACTIVE,
    type: AccountType.POSITION,
    currencyCode: "EUR",
    currencyDecimals: null,
    debitBalance: "0",
    creditBalance: "0",
    timestampLastJournalEntry: null
};
const idAccountA: string = await restClient.createAccount(accountDtoA);

// Account B.
const accountDtoB: IAccountDto = {
    id: null,
    externalId: null,
    state: AccountState.ACTIVE,
    type: AccountType.POSITION,
    currencyCode: "EUR",
    currencyDecimals: null,
    debitBalance: "0",
    creditBalance: "0",
    timestampLastJournalEntry: null
};
const idAccountB: string = await restClient.createAccount(accountDtoB);

// TODO: credit accounts A and B with an hub account.

// Journal entry A.
const journalEntryDtoA: IJournalEntryDto = {
    id: null,
    externalId: null,
    externalCategory: null,
    currencyCode: "EUR",
    currencyDecimals: null,
    amount: "5",
    debitedAccountId: idAccountA,
    creditedAccountId: idAccountB,
    timestamp: null
};

// Journal entry B.
const journalEntryDtoB: IJournalEntryDto = {
    id: null,
    externalId: null,
    externalCategory: null,
    currencyCode: "EUR",
    currencyDecimals: null,
    amount: "5",
    debitedAccountId: idAccountB,
    creditedAccountId: idAccountA,
    timestamp: null
};

try {
    const idsJournalEntries: string[] = await restClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);
} catch (error: unknown) {
    logger.error(error);
}
```

### Get Account by Id
```typescript
const accountId: string = "a";

try {
    const accountDto: IAccountDto | null = await restClient.getAccountById(accountId);
} catch (error: unknown) {
    logger.error(error);
}
```

### Get Accounts by External Id
```typescript
const externalId: string = "a";

try {
    const accountDtos: IAccountDto[] = await restClient.getAccountsByExternalId(externalId);
} catch (error: unknown) {
    logger.error(error);
}
```

### Get Journal Entries by Account Id
```typescript
const accountId: string = "a";

try {
    const journalEntryDtos: IJournalEntryDto[] = await restClient.getJournalEntriesByAccountId(accountId);
} catch (error: unknown) {
    logger.error(error);
}
```

## See Also
- [Accounts and Balances REST service](https://github.com/mojaloop/accounts-and-balances-bc/tree/main/packages/rest-svc)
