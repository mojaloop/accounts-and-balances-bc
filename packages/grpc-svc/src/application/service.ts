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




import {existsSync} from "fs";
import {
    AuditClient,
    KafkaAuditClientDispatcher,
    LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {AuthorizationClient, LoginHelper} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {IChartOfAccountsRepo} from "../domain/infrastructure-types/chart_of_accounts_repo";
import {MLKafkaJsonConsumer, MLKafkaJsonConsumerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {ChartOfAccountsPrivilegesDefinition} from "./privileges";
import {GrpcServer} from "./grpc_server/grpc_server";
import {BuiltinLedgerAdapter, ChartOfAccountsMongoRepo} from "../implementations";
import {AccountsAndBalancesAggregate} from "../domain/aggregate";
import { ILedgerAdapter } from "../domain/infrastructure-types/ledger_adapter";
import process from "process";
import {IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {PrometheusMetrics} from "@mojaloop/platform-shared-lib-observability-client-lib";
import {IConfigurationClient} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {AuthenticatedHttpRequester} from "@mojaloop/security-bc-client-lib";
import {
    DefaultConfigProvider,
    IConfigProvider
} from "@mojaloop/platform-configuration-bc-client-lib";

import express, {Express} from "express";
import {Server} from "net";
import {GetCoAConfigClient} from "./configset";
import {TigerBeetleLedgerAdapter} from "../implementations/tiger_beetle_ledger_adapter";


/* ********** Constants Begin ********** */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../../package.json");
const BC_NAME = "accounts-and-balances-bc";
const APP_NAME = "coa-grpc-svc";
const APP_VERSION = packageJSON.version;
const LOG_LEVEL: LogLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.DEBUG;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;

const KAFKA_URL = process.env.KAFKA_URL || "localhost:9092";
const KAFKA_LOGS_TOPIC = process.env.KAFKA_LOGS_TOPIC || "logs";
const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const MONGO_URL = process.env.MONGO_URL || "mongodb://root:mongoDbPas42@localhost:27017";
const BUILTIN_LEDGER_SVC_URL = process.env.BUILTIN_LEDGER_SVC_URL || "localhost:3350";

const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";

const AUTH_Z_SVC_BASEURL = process.env.AUTH_Z_SVC_BASEURL || "http://localhost:3202";

const ACCOUNTS_AND_BALANCES_URL = process.env.ACCOUNTS_AND_BALANCES_URL || "0.0.0.0:3300";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "accounts-and-balances-bc-coa-grpc-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

const USE_TIGERBEETLE = process.env["USE_TIGERBEETLE"] && process.env["USE_TIGERBEETLE"].toUpperCase()==="TRUE" || false;
const TIGERBEETLE_CLUSTER_ID = process.env["TIGERBEETLE_CLUSTER_ID"] || 1;
const TIGERBEETLE_CLUSTER_REPLICA_ADDRESSES = process.env["TIGERBEETLE_CLUSTER_REPLICA_ADDRESSES"] || "9001";

const REDIS_HOST = process.env["REDIS_HOST"] || "localhost";
const REDIS_PORT = (process.env["REDIS_PORT"] && parseInt(process.env["REDIS_PORT"])) || 6379;

const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3301;
const SERVICE_START_TIMEOUT_MS= (process.env["SERVICE_START_TIMEOUT_MS"] && parseInt(process.env["SERVICE_START_TIMEOUT_MS"])) || 60_000;

/* ********** Constants End ********** */

const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

const kafkaConsumerOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}_authz_client`
};

let globalLogger: ILogger;

export class ChartOfAccountsGrpcService {
    private static logger: ILogger;
    static app: Express;
    static expressServer: Server;
    private static auditingClient: IAuditClient;
    private static tokenHelper: TokenHelper;
    private static authorizationClient: IAuthorizationClient;
    private static chartOfAccountsRepo: IChartOfAccountsRepo;
    private static ledgerAdapter: ILedgerAdapter;
    private static grpcServer: GrpcServer;
    private static metrics:IMetrics;
    private static configClient:IConfigurationClient;
    private static loggerIsChild: boolean; // TODO: avoid this.
    static startupTimer: NodeJS.Timeout;

    static async start(
        logger?: ILogger,
        authorizationClient?: IAuthorizationClient,
        auditingClient?: IAuditClient,
        chartOfAccountsRepo?: IChartOfAccountsRepo,
        ledgerAdapter?: ILedgerAdapter,
        metrics?:IMetrics,
        configProvider?: IConfigProvider
    ): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);

        // Logger.
        if (!logger) {
            logger = new KafkaLogger(
                BC_NAME,
                APP_NAME,
                APP_VERSION,
                kafkaProducerOptions,
                KAFKA_LOGS_TOPIC,
                LOG_LEVEL
            );
            await (logger as KafkaLogger).init();
        }
        globalLogger = this.logger = logger;

        /// start config client - this is not mockable (can use STANDALONE MODE if desired)
        if(!configProvider) {
            // create the instance of IAuthenticatedHttpRequester
            const authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
            authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

            const messageConsumer = new MLKafkaJsonConsumer({
                kafkaBrokerList: KAFKA_URL,
                kafkaGroupId: `${APP_NAME}_${Date.now()}` // unique consumer group - use instance id when possible
            }, this.logger.createChild("configClient.consumer"));
            configProvider = new DefaultConfigProvider(logger, authRequester, messageConsumer);
        }

        this.configClient = GetCoAConfigClient(configProvider, BC_NAME, APP_NAME, APP_VERSION);
        await this.configClient.init();
        await this.configClient.bootstrap(true);
        await this.configClient.fetch();

        // Repo.
        if (chartOfAccountsRepo !== undefined) {
            this.chartOfAccountsRepo = chartOfAccountsRepo;
        } else {
            this.chartOfAccountsRepo = new ChartOfAccountsMongoRepo(
                this.logger,
                MONGO_URL,
                REDIS_HOST,
                REDIS_PORT
            );
            try {
                await this.chartOfAccountsRepo.init();
            } catch (error: unknown) {
                this.logger.fatal(error);
                await this.stop();
                process.exit(-1); // TODO: verify code.
            }
        }

        // Ledger adapter.
        if (ledgerAdapter !== undefined) {
            this.ledgerAdapter = ledgerAdapter;
        } else {
            if(USE_TIGERBEETLE){
                this.ledgerAdapter = new TigerBeetleLedgerAdapter(
                    Number(TIGERBEETLE_CLUSTER_ID),
                    [TIGERBEETLE_CLUSTER_REPLICA_ADDRESSES],
                    logger
                );
                try {
                    await this.ledgerAdapter.init();
                } catch (error: unknown) {
                    this.logger.fatal(error);
                    await this.stop();
                    process.exit(-1); // TODO: verify code.
                }
            }else {
                const loginHelper = new LoginHelper(AUTH_N_SVC_TOKEN_URL, logger);
                loginHelper.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

                this.ledgerAdapter = new BuiltinLedgerAdapter(BUILTIN_LEDGER_SVC_URL, loginHelper, this.logger);
                try {
                    await this.ledgerAdapter.init();
                } catch (error: unknown) {
                    this.logger.fatal(error);
                    await this.stop();
                    process.exit(-1); // TODO: verify code.
                }
            }
        }

        // start auditClient
        if (!auditingClient) {
            if (!existsSync(AUDIT_KEY_FILE_PATH)) {
                if (PRODUCTION_MODE) process.exit(9);
                // create e tmp file
                LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
            }
            const auditLogger = logger.createChild("AuditLogger");
            auditLogger.setLogLevel(LogLevel.INFO);
            const cryptoProvider = new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
            const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, auditLogger);
            // NOTE: to pass the same kafka logger to the audit client, make sure the logger is started/initialised already
            auditingClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
            await auditingClient.init();
        }
        this.auditingClient = auditingClient;

        // authorization client
        if (!authorizationClient) {
            // create the instance of IAuthenticatedHttpRequester
            const authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
            authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

            const consumerHandlerLogger = logger.createChild("authorizationClientConsumer");
            const messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, consumerHandlerLogger);

            // setup privileges - bootstrap app privs and get priv/role associations
            authorizationClient = new AuthorizationClient(
                BC_NAME, APP_NAME, APP_VERSION,
                AUTH_Z_SVC_BASEURL, logger.createChild("AuthorizationClient"),
                authRequester,
                messageConsumer
            );
            authorizationClient.addPrivilegesArray(ChartOfAccountsPrivilegesDefinition);
            await (authorizationClient as AuthorizationClient).bootstrap(true);
            await (authorizationClient as AuthorizationClient).fetch();
            // init message consumer to automatically update on role changed events
            await (authorizationClient as AuthorizationClient).init();
        }
        this.authorizationClient = authorizationClient;

        // metrics client
        if(!metrics){
            const labels: Map<string, string> = new Map<string, string>();
            labels.set("bc", BC_NAME);
            labels.set("app", APP_NAME);
            labels.set("version", APP_VERSION);
            PrometheusMetrics.Setup({prefix:"", defaultLabels: labels}, this.logger);
            metrics = PrometheusMetrics.getInstance();
        }
        this.metrics = metrics;

        // Aggregate.
        const accountsAndBalancesAggregate: AccountsAndBalancesAggregate = new AccountsAndBalancesAggregate(
            this.logger,
            this.authorizationClient,
            this.auditingClient,
            this.chartOfAccountsRepo,
            this.ledgerAdapter,
            this.configClient,
            this.metrics
        );

        // token helper
        this.logger.info(`Starting TokenHelper with jwksUrl: ${AUTH_N_SVC_JWKS_URL} issuerName: ${AUTH_N_TOKEN_ISSUER_NAME} audience: ${AUTH_N_TOKEN_AUDIENCE}`);
        this.tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
        await this.tokenHelper.init();


        // gRPC server.
        this.grpcServer = new GrpcServer(
            this.logger,
            this.tokenHelper,
            this.metrics,
            accountsAndBalancesAggregate,
            ACCOUNTS_AND_BALANCES_URL
        );

        // start grpc server
        await this.grpcServer.start();

        await this.setupExpress();

        // remove startup timeout
        clearTimeout(this.startupTimer);
    }

    static setupExpress(): Promise<void> {
        return new Promise<void>(resolve => {
            this.app = express();
            this.app.use(express.json()); // for parsing application/json
            this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

            // Add health and metrics http routes
            this.app.get("/health", (req: express.Request, res: express.Response) => {
                return res.send({ status: "OK" });
            });
            this.app.get("/metrics", async (req: express.Request, res: express.Response) => {
                const strMetrics = await (this.metrics as PrometheusMetrics).getMetricsForPrometheusScrapper();
                return res.send(strMetrics);
            });

            this.app.use((req, res) => {
                // catch all
                res.send(404);
            });

            this.expressServer = this.app.listen(SVC_DEFAULT_HTTP_PORT, () => {
                this.logger.info(`🚀Server ready at: http://localhost:${SVC_DEFAULT_HTTP_PORT}`);
                this.logger.info(`ChartOfAccountsGrpcService v: ${APP_VERSION} started`);
                resolve();
            });
        });
    }

    static async stop(): Promise<void> {
        if (this.grpcServer !== undefined) {
            await this.grpcServer.stop();
        }
        if (this.ledgerAdapter !== undefined) {
            await this.ledgerAdapter.destroy();
        }
        if (this.chartOfAccountsRepo !== undefined) {
            await this.chartOfAccountsRepo.destroy();
        }
        if (this.auditingClient !== undefined) {
            await this.auditingClient.destroy();
        }
        if (this.logger instanceof KafkaLogger && !this.loggerIsChild) {
            await this.logger.destroy();
        }
    }

}

/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    let clean_exit = false;
    setTimeout(() => {
        clean_exit || process.exit(99);
    }, 5000);

    // call graceful stop routine
    await ChartOfAccountsGrpcService.stop();

    clean_exit = true;
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals);
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
process.on("exit", async () => {
    console.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
    console.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
});
