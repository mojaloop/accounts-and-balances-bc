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
import {
    AccountsAndBalancesGrpcClient,
    GrpcAccountState,
    GrpcAccountType
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";

const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST: string = "localhost";
const ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO: number = 1234;

const logger: ILogger = new ConsoleLogger();
const accountsAndBalancesGrpcClient: AccountsAndBalancesGrpcClient = new AccountsAndBalancesGrpcClient(
	logger,
	ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST,
	ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO
);
await accountsAndBalancesGrpcClient.init();
```

### Create Account
```
const account: GrpcAccount = {
	id: "a",
	externalId: "",
	state: GrpcAccountState.ACTIVE,
	type: GrpcAccountType.POSITION,
	currency: "EUR",
	creditBalance: "100",
	debitBalance: "25",
	timestampLastJournalEntry: "0"
}
try {
    const accountIdReceived: string = await accountsAndBalancesGrpcClient.createAccount(account);
} catch (error: unknown) {
    logger.error(error);
}
```

### Create Journal Entries
```
```

### Get Account by Id
```
```

### Get Accounts by External Id
```
```

### Get Journal Entries by Account Id
```
```

## See Also

- [Accounts and Balances gRPC service](https://github.com/mojaloop/accounts-and-balances-bc/tree/main/packages/grpc-svc)
