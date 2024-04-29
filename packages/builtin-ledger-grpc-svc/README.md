# Accounts and Balances BC - gRPC Service

## Start
```shell
$ npm -w @mojaloop/accounts-and-balances-bc-grpc-svc start
```

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
| SVC_CLIENT_ID        | Service client ID                 | accounts-and-balances-bc-builtinledger-grpc-svc               |
| SVC_CLIENT_SECRET    | Service client secret             | superServiceSecret     |
| USE_TIGERBEETLE | Flag indicating the use of tiggerbeetle | false | 
| TIGERBEETLE_CLUSTER_ID | Tigerbeetle Cluster Id | 1 | 
| TIGERBEETLE_CLUSTER_REPLICA_ADDRESSES | Tigerbeetle Cluster Replica Addresses | 9001 | 
| REDIS_HOST | Redis Host Name | localhost | 
| REDIS_PORT | Redis Port No | 6379 | 
| SVC_DEFAULT_HTTP_PORT                 | Default HTTP port for the service                  | 3351  |
| SERVICE_START_TIMEOUT_MS               | Timeout for service startup in milliseconds        | 60_000                 |