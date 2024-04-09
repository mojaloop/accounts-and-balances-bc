# TODO

## Accounts and Balances High level requests

### Check Payer Liquidity and Reserve - for transfer prepare step

Request to reserve payer funds, sent by the transfers BC during the prepare step.
This request should do in one (all or nothing) step:
- 1.1 - Assert that: payer.pos.post.dr + payer.pos.pend.dr - payer.pos.post.cr + trx.amount <= (payer.liq.post.cr - payer.liq.post.dr) - NDC
- 1.2 - Increase the pending debit balance of the payer's position account by the transfer amount (has the effect of reducing its position)
- 1.3 - Increase the pending credit balance of the Hub Joke account by the transfer amount (this hub account can be seen as the tally of the in flight) 

Inputs
- payer position account id - string
- payer liquidity account id - string
- Hub Joke account id - string 
- amount - string 
- currency code - string
- payer net debit cap - string

Output
- success - boolean

### Cancel Reservation and Commit - for transfer fulfil step

Request to revert the initial reservation, commit payer funds and credit the payee, send by the transfers BC during the prepare step.

This request should in two (all or nothing) step:
- 1.1 - Decrease the pending debit balance of the payer's position account by the transfer amount
- 1.2 - Decrease the pending credit balance of the Hub Joke account by the transfer amount
- 2.1 - Increase the posted debit balance of the payer's position account by the transfer amount
- 2.2 - Increase the posted credit balance of the payee's position account by the transfer amount

Inputs:
- payer position account id - string
- payee position account id - string
- Hub Joke account id - string
- amount - string
- currency code - string

Output
- success - boolean

## Accounts and Balances Low level requests

### Create accounts (array)
(to be documented)

### Create journal entries (array)
(to be documented)

### Get accounts by ids (array)
(to be documented)

### Get accounts by owner id (array)
(to be documented)

### Get entries by account id
(to be documented)


## Configuration 

### Environment variables

| Environment Variable | Description    | Example Values         |
|---------------------|-----------------|-----------------------------------------|
| LOG_LEVEL            | Logging level for the application                  | LogLevel.DEBUG        |
| PRODUCTION_MODE      | Flag indicating production mode   | FALSE                  |
| KAFKA_URL       | Kafka broker URL     | localhost:9092          |
| KAFKA_LOGS_TOPIC      | Kafka topic for logs          | logs    |
| KAFKA_AUDITS_TOPIC        | Kafka topic for audits              | audits                 |
| MONGO_URL            | MongoDB connection URL             | mongodb://root:mongoDbPas42@localhost:27017/ |
| BUILTIN_LEDGER_SVC_URL  | Builtin Ledger Service URL | localhost:3350 |
| AUDIT_KEY_FILE_PATH  | File path for audit key           | /app/data/audit_private_key.pem         |
| AUTH_N_SVC_BASEURL | Authentication service base URL  |http://localhost:3201|
| AUTH_N_SVC_JWKS_URL  | Authentication service base URL    | http://authentication-svc:3201         |
| AUTH_N_TOKEN_ISSUER_NAME    | Authentication service token issuer name           |   mojaloop.vnext.dev.default_issuer    |
| AUTH_N_TOKEN_AUDIENCE        | Authentication service token audience    |    mojaloop.vnext.dev.default_audience   |
| AUTH_Z_SVC_BASEURL   | Authorization service base URL    | http://authorization-svc:3202           |
| AUTH_N_SVC_BASEURL | Authentication service base URL  |http://localhost:3201|
| ACCOUNTS_AND_BALANCES_URL  | Accounts and Balances Service URL  |  0.0.0.0:3300 |
| SVC_CLIENT_ID        | Service client ID                 | accounts-and-balances-bc-coa-grpc-svc               |
| SVC_CLIENT_SECRET    | Service client secret             | superServiceSecret     |
| USE_TIGERBEETLE | Flag indicating the use of tiggerbeetle | false | 
| TIGERBEETLE_CLUSTER_ID | Tigerbeetle Cluster Id | 1 | 
| TIGERBEETLE_CLUSTER_REPLICA_ADDRESSES | Tigerbeetle Cluster Replica Addresses | 9001 | 
| REDIS_HOST | Redis Host Name | localhost | 
| REDIS_PORT | Redis Port No | 6379 | 
| SVC_DEFAULT_HTTP_PORT                 | Default HTTP port for the service                  | 3301  |
| SERVICE_START_TIMEOUT_MS               | Timeout for service startup in milliseconds        | 60_000                 |