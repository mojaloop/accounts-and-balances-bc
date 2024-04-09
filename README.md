# Accounts and Balances Bounded Context

The Accounts and Balances BC acts as the “central ledger” for the system. It interacts primarily with the Settlements BC, Participants Lifecycle BC and Transfers BCs, and is a directed sub-system, which means that it is a dependency of the BCs that use it as a “financial system of record” for the financial accounting.

See the Reference Architecture documentation [Thirdparty API](https://mojaloop.github.io/reference-architecture-doc/boundedContexts/thirdPartyApi/) for context on this vNext implementation guidelines.  

## Contents
- [accounts-and-balances-bc](#accounts-and-balances-bc)
  - [Contents](#contents)
  - [Packages](#packages)
  - [Running Locally](#running-locally)
  - [Configuration](#configuration)
  - [Tests](#tests)
  - [Auditing Dependencies](#auditing-dependencies)
  - [CI/CD](#cicd-pipelines)
  - [Documentation](#documentation)

## Packages
The Accounts and Balances BC consists of the following packages;

`builtin-ledger-grpc-client-lib`
Builtin Ledger GRPC Client Library.
[README](./packages/builtin-ledger-grpc-client-lib/README.md)

`builtin-ledger-grpc-svc`
Builtin Ledger GRPC Service.
[README](./packages/builtin-ledger-grpc-svc/README.md)

`grpc-client-lib`
GRPC Client Library.
[README](./packages/grpc-client-lib/README.md)
 
`grpc-svc`
GRPCS Service.
[README](./packages/grpc-svc/README.md)
 
`public-types-lib`
Accounts and Balances BC Public Types Library.
[README](packages/public-types-lib/README.md) 

`shared-mocks-lib`
Mock implementation used for testing.
[README](./packages/shared-mocks-lib/README.md)

## Running Locally

Please follow the instruction in [Onboarding Document](Onboarding.md) to setup and run the service locally.

## Configuration

See the README.md file on each services for more Environment Variable Configuration options.

## Tests

### Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```shell
npm run test:integration
```

### Run all tests at once
Requires integration tests pre-requisites
```shell
npm run test
```

# Collect coverage (from both unit and integration test types)

After running the unit and/or integration tests: 

```shell
npm run posttest
```

You can then consult the html report in:

```shell
coverage/lcov-report/index.html
```

## Auditing Dependencies
We use npm audit to check dependencies for node vulnerabilities. 

To start a new resolution process, run:
```
npm run audit:fix
``` 

You can check to see if the CI will pass based on the current dependencies with:

```
npm run audit:check
```

## CI/CD Pipelines

### Execute locally the pre-commit checks - these will be executed with every commit and in the default CI/CD pipeline 

Make sure these pass before committing any code
```
npm run pre_commit_check
```

### Work Flow 

 As part of our CI/CD process, we use CircleCI. The CircleCI workflow automates the process of publishing changed packages to the npm registry and building Docker images for select packages before publishing them to DockerHub. It also handles versioning, tagging commits, and pushing changes back to the repository.

The process includes five phases. 
1. Setup : This phase initializes the environment, loads common functions, and retrieves commits and git change history since the last successful CI build.

2. Detecting Changed Package.

3. Publishing Changed Packages to NPM.

4. Building Docker Images and Publishing to DockerHub.

5. Pushing Commits to Git.

 All code is automatically linted, built, and unit tested by CircleCI pipelines, where unit test results are kept for all runs. All libraries are automatically published to npm.js, and all Docker images are published to Docker Hub.

 ## Documentation
The following documentation provides insight into the FSP Interoperability API Bounded Context.

- **Reference Architecture** - https://mojaloop.github.io/reference-architecture-doc/boundedContexts/accountsAndBalances/
- **MIRO Board** - https://miro.com/app/board/o9J_lJyA1TA=/
- **Work Sessions** - https://docs.google.com/document/d/1Nm6B_tSR1mOM0LEzxZ9uQnGwXkruBeYB2slgYK1Kflo/edit#heading=h.6w64vxvw6er4