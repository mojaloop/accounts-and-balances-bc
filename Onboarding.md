# Onboarding

>*Note:* Before completing this guide, make sure you have completed the _general_ onboarding guide in the [base mojaloop repository](https://github.com/mojaloop/mojaloop/blob/main/onboarding.md#mojaloop-onboarding).

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Service Overview](#2-service-overview)
3. [Installing and Building](#3-installing-and-building)
4. [Running Locally](#4-running-locally-dependencies-inside-of-docker)
5. [Dependencies](#5-dependencies)
6. [Testing](#6-testing)
7. [Common Errors/FAQs](#7-common-errorsfaqs)

##  1. Prerequisites

If you have followed the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/main/onboarding.md#mojaloop-onboarding), you should already have the following cli tools installed:

* `brew` (macOS), [todo: windows package manager]
* `curl`, `wget`
* `docker` + `docker-compose`
* `node`, `npm` and (optionally) `nvm`

## 2. Service Overview 
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


## 3. <a name='InstallingandBuilding'></a>Installing and Building

Firstly, clone your fork of the `accounts-and-balances-bc` onto your local machine:
```bash
git clone https://github.com/<your_username>/accounts-and-balances-bc.git
```

Then `cd` into the directory and install the node modules:
```bash
cd accounts-and-balances-bc
```

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Dependencies

```bash
npm install
```

#### Build

```bash
npm run build
``` 

## 4. Running Locally (dependencies inside of docker)

In this method, we will run all of the core dependencies inside of docker containers, while running the `builtin-ledger-grpc-svc` server on your local machine.

### Startup supporting services

### 4.1 Run all back-end dependencies as part of the Docker Compose

Use [platform-shared-tools docker-compose files](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/): 
Follow instructions in the `README.md` files to run the supporting services. Make sure you have the following services up and running:

- infra services : [docker-compose-infra](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-infra)
	- mongo
	- kafka
	- zoo
- cross-cutting services : [docker-compose-cross-cutting](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-cross-cutting)
	- authentication-svc
	- authorization-svc
	- identity-svc
	- platform-configuration-svc

This will do the following:
* `docker pull` down any dependencies defined in each `docker-compose.yml` file, and the services.
* run all of the containers together
* ensure that all dependencies have started for each services.

**Important:** please make sure you follow the steps available through the **admin-ui** demonstrated in the sections [here](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-apps#participants) (you can ignore the Account-Lookup part). There is required data to already exist such as **participants** endpoints exists and its accounts have funds available, otherwise the integrations will fail.

### 4.2 Run the server

```bash
npm run start:builtin-ledger-grpc-svc
```

## 5. Dependencies

## Dependencies

### Kafka

#### Docker
```shell
$ docker run \
    --name c_kafka \
    -e NUM_PARTITIONS=10 \
    -e ADVERTISED_HOST=localhost \
    -p 2181:2181 \
    -p 9092:9092 \
    -d \
    johnnypark/kafka-zookeeper
```

### MongoDB

#### Docker
```shell
$ docker run \
    --name c_mongodb \
    -e MONGO_INITDB_ROOT_USERNAME=root \
    -e MONGO_INITDB_ROOT_PASSWORD=root \
    -p 27017:27017 \
    -d \
    mongo
```

#### MongoDB Shell
```shell
$ use admin

$ db.createUser({
    user: "accounts-and-balances-bc",
    pwd: "123456789",
    roles: [{role: "readWrite", db: "accounts_and_balances_bc"}]
})
```

### Elasticsearch

#### Docker
```shell
$ docker network create n_elasticsearch

$ docker run \
    --name c_elasticsearch \
    -e "discovery.type=single-node" \
    -e ES_JAVA_OPTS="-Xms512m -Xmx512m" \
    --net n_elasticsearch \
    -p 9200:9200 \
    -p 9300:9300 \
    -it \
    elasticsearch:8.4.3

(Detach from the container with Ctrl + p and Ctrl + q (first Ctrl + p and, right after, Ctrl + q).)

$ docker cp c_elasticsearch:/usr/share/elasticsearch/config/certs/http_ca.crt ./elasticsearch_http_ca.crt
```

#### HTTP Client
**POST/PUT** https://localhost:9200/_security/role/accounts-and-balances-bc
```json
{
    "indices": [
        {
            "names": [
                "accounts",
                "journal_entries"
            ],
            "privileges": ["all"]
        }
    ]
}
```
**POST/PUT** https://localhost:9200/_security/user/accounts-and-balances-bc
```json
{
    "password": "123456789",
    "roles": ["accounts-and-balances-bc"]
}
```


## 6. Testing
We use `npm` scripts as a common entrypoint for running the tests. Tests include unit, functional, and integration.

```bash
# unit tests:
npm run test:unit

# check test coverage
npm run test:coverage

# integration tests
npm run test:integration
```

### 6.1 Testing the `accounts-and-balances-bc` API with Postman

[Here](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/postman) you can find a complete Postman collection, in a json file, ready to be imported to Postman.


## Common Errors/FAQs 

### Unable to load dlfcn_load
```bash
error:25066067:DSO support routines:dlfcn_load:could not load the shared library
```
Fix: https://github.com/mojaloop/security-bc.git  `export OPENSSL_CONF=/dev/null`