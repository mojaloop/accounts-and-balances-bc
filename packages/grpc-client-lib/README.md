# Accounts and Balances gRPC Client Library

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/accounts-and-balances-bc.svg?style=flat)](https://github.com/mojaloop/accounts-and-balances-bc/commits/main)
[![Git Releases](https://img.shields.io/github/release/mojaloop/accounts-and-balances-bc.svg?style=flat)](https://github.com/mojaloop/accounts-and-balances-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop/accounts-and-balances-bc-grpc-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/accounts-and-balances-bc-grpc-client-lib)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/accounts-and-balances-bc-grpc-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/accounts-and-balances-bc-grpc-client-lib)
[![CircleCI](https://circleci.com/gh/mojaloop/accounts-and-balances-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/accounts-and-balances-bc)

This is the gRPC client library for the Accounts and Balances bounded context.  
It allows for the following operations:
- **Create account**: create a single account.
- **Create journal entries**: create 1 or more journal entries.
- **Get account by id**: get an account by id.
- **Get accounts by external id**: get all the accounts with a specific external id.
- **Get journal entries by account id**: get all the journal entries with a specific account id - either the credited account id or the debited account id.

## Install
```
npm install @mojaloop/accounts-and-balancs-bc-grpc-client-lib
```

## Usage

### Configure
```
import {ILogger, ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesGrpcClient} from "@mojaloop/accounts-and-balancs-bc-grpc-client-lib";

const HOST_ACCOUNTS_AND_BALANCES_GRPC_SERVICE: string = "localhost";
const PORT_NO_ACCOUNTS_AND_BALANCES_GRPC_SERVICE: number = 1234;

const logger: ILogger = new ConsoleLogger();
const accountsAndBalancesGrpcClient: AccountsAndBalancesGrpcClient = new AccountsAndBalancesGrpcClient(
    logger,
    HOST_ACCOUNTS_AND_BALANCES_GRPC_SERVICE,
    PORT_NO_ACCOUNTS_AND_BALANCES_GRPC_SERVICE
);
await accountsAndBalancesGrpcClient.init();
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
    const accountIdReceived: string = await accountsAndBalancesGrpcClient.createAccount(accountDto);
} catch (error: unknown) {
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
await accountsAndBalancesGrpcClient.createAccount(accountDtoA);
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
await accountsAndBalancesGrpcClient.createAccount(accountDtoB);
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
        await accountsAndBalancesGrpcClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB]);
} catch (error: unknown) {
    logger.error(e);
}
```

### Get Account by Id
```
const accountId: string = "a";
try {
    const accountDto: IAccountDto | null = await accountsAndBalancesGrpcClient.getAccountById(accountId);
} catch (error: unknown) {
    logger.error(e);
}
```

### Get Accounts by External Id
```
const externalId: string = "a";
try {
    const accountDtos: IAccountDto[] = await accountsAndBalancesGrpcClient.getAccountsByExternalId(externalId);
} catch (error: unknown) {
    logger.error(e);
}
```

### Get Journal Entries by Account Id
```
const accountId: string = "a";
try {
    const journalEntryDtos: IJournalEntryDto[] =
        await accountsAndBalancesGrpcClient.getJournalEntriesByAccountId(accountId);
} catch (error: unknown) {
    logger.error(e);
}
```

### Terminate
```
await accountsAndBalancesGrpcClient.destroy();
```

## See Also
- [Accounts and Balances gRPC service](https://github.com/mojaloop/accounts-and-balances-bc/tree/main/packages/grpc-svc)
