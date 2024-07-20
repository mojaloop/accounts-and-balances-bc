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


import {
	AuditClient,
	KafkaAuditClientDispatcher,
	LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
    AuthenticatedHttpRequester,
    AuthorizationClient,
    LoginHelper,
    TokenHelper
} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient, ILoginHelper} from "@mojaloop/security-bc-public-types-lib";
import {existsSync} from "fs";
import {BuiltinLedgerAggregate} from "../domain/aggregate";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {BuiltinLedgerAccountsMongoRepo} from "../implementations/builtin_ledger_accounts_mongo_repo";
import {BuiltinLedgerJournalEntriesMongoRepo} from "../implementations/builtin_ledger_journal_entries_mongo_repo";
import {BuiltinLedgerGrpcServer} from "./grpc_server/grpc_server";
import {BuiltinLedgerPrivilegesDefinition} from "./privileges";
import process from "process";
import {IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {PrometheusMetrics} from "@mojaloop/platform-shared-lib-observability-client-lib";
import express, {Express} from "express";
import {Server} from "net";
import {IConfigurationClient} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {
    MLKafkaJsonConsumer,
    MLKafkaJsonConsumerOptions,
    MLKafkaJsonProducerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {DefaultConfigProvider, IConfigProvider} from "@mojaloop/platform-configuration-bc-client-lib";
import {GetBuiltinLedgerConfigClient} from "./configset";
import {dirname, join} from "path";
import * as protoLoader from "@grpc/proto-loader";
import {
    GRPC_LOAD_PROTO_OPTIONS, GRPC_METADATA_TOKEN_FIELD_KEY,
    IAnbGrpcCertificatesFiles
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import * as grpc from "@grpc/grpc-js";
import {
    GrpcControlPlaneServiceClient
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlaneService";
import {ProtoGrpcType as ControlPlaneProtoGrpcType} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/control_plane";
import {
    GrpcControlPlane_ToLedgerMsg,
    GrpcControlPlane_ToLedgerMsg__Output
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_ToLedgerMsg";
import {
    GrpcControlPlane_FromLedgerMsg
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_FromLedgerMsg";
import console from "console";

import {
    GrpcControlPlane_LedgerInitialMsg
} from "@mojaloop/accounts-and-balances-bc-public-types-lib/dist/proto/aandb/controlplane/GrpcControlPlane_LedgerInitialMsg";
import crypto from "crypto";
import * as fs from "fs";
import {Metadata} from "@grpc/grpc-js";


/* ********** Constants Begin ********** */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../../package.json");

const BC_NAME: string = "accounts-and-balances-bc";
const APP_NAME: string = "builtin-ledger-grpc-svc";
const APP_VERSION = packageJSON.version;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const INSTANCE_NAME = `${BC_NAME}_${APP_NAME}`;
const INSTANCE_ID = `${INSTANCE_NAME}__${crypto.randomUUID()}`;


// Message Consumer/Publisher
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const KAFKA_AUTH_ENABLED = process.env["KAFKA_AUTH_ENABLED"] && process.env["KAFKA_AUTH_ENABLED"].toUpperCase()==="TRUE" || false;
const KAFKA_AUTH_PROTOCOL = process.env["KAFKA_AUTH_PROTOCOL"] || "sasl_plaintext";
const KAFKA_AUTH_MECHANISM = process.env["KAFKA_AUTH_MECHANISM"] || "plain";
const KAFKA_AUTH_USERNAME = process.env["KAFKA_AUTH_USERNAME"] || "user";
const KAFKA_AUTH_PASSWORD = process.env["KAFKA_AUTH_PASSWORD"] || "password";

const LOG_LEVEL: LogLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.DEBUG;
const KAFKA_LOGS_TOPIC = process.env.KAFKA_LOGS_TOPIC || "logs";
const KAFKA_AUDITS_TOPIC = process.env.KAFKA_AUDITS_TOPIC || "audits";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";

const AUTH_Z_SVC_BASEURL = process.env.AUTH_Z_SVC_BASEURL || "http://localhost:3202";

const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";


const MONGO_URL = process.env.MONGO_URL || "mongodb://root:mongoDbPas42@localhost:27017";

const ACCOUNTS_BALANCES_COA_SVC_URL = process.env.ACCOUNTS_BALANCES_COA_SVC_URL || "localhost:3300";
const BUILTIN_LEDGER_URL = process.env.BUILTIN_LEDGER_URL || "0.0.0.0:3350";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "accounts-and-balances-bc-builtinledger-grpc-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

const REDIS_HOST = process.env["REDIS_HOST"] || "localhost";
const REDIS_PORT = (process.env["REDIS_PORT"] && parseInt(process.env["REDIS_PORT"])) || 6379;

const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3351;
const SERVICE_START_TIMEOUT_MS= (process.env["SERVICE_START_TIMEOUT_MS"] && parseInt(process.env["SERVICE_START_TIMEOUT_MS"])) || 60_000;
const GRPC_CONNECT_TIMEOUT_MS= (process.env["GRPC_CONNECT_TIMEOUT_MS"] && parseInt(process.env["GRPC_CONNECT_TIMEOUT_MS"])) || 5_000;

const PUBLIC_TYPES_LIB_PATH = require.resolve("@mojaloop/accounts-and-balances-bc-public-types-lib");
const CONTROL_PLANE_PROTO_FILE_NAME = "control_plane.proto";
const USE_TLS_GRPC = process.env["USE_TLS_GRPC"] && process.env["USE_TLS_GRPC"].toUpperCase() === "TRUE" || false;

/* ********** Constants End ********** */

// kafka common options
const kafkaProducerCommonOptions:MLKafkaJsonProducerOptions = {
    kafkaBrokerList: KAFKA_URL,
    producerClientId: `${INSTANCE_ID}`,
};
const kafkaConsumerCommonOptions:MLKafkaJsonConsumerOptions ={
    kafkaBrokerList: KAFKA_URL
};
if(KAFKA_AUTH_ENABLED){
    kafkaProducerCommonOptions.authentication = kafkaConsumerCommonOptions.authentication = {
        protocol: KAFKA_AUTH_PROTOCOL as "plaintext" | "ssl" | "sasl_plaintext" | "sasl_ssl",
        mechanism: KAFKA_AUTH_MECHANISM as "PLAIN" | "GSSAPI" | "SCRAM-SHA-256" | "SCRAM-SHA-512",
        username: KAFKA_AUTH_USERNAME,
        password: KAFKA_AUTH_PASSWORD
    };
}



let globalLogger: ILogger;

export class BuiltinLedgerGrpcService {
	private static logger: ILogger;
    static app: Express;
    static expressServer: Server;
	private static auditingClient: IAuditClient;
	private static authorizationClient: IAuthorizationClient;
	private static builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private static builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
	private static grpcServer: BuiltinLedgerGrpcServer;
    private static metrics:IMetrics;
    private static tokenHelper: TokenHelper;
    private static configClient:IConfigurationClient;
    private static loginHelper:ILoginHelper
	private static loggerIsChild: boolean; // TODO: avoid this.

    private static controlPlaneClient:GrpcControlPlaneServiceClient;
    private static controlPlaneStream:grpc.ClientDuplexStream<GrpcControlPlane_FromLedgerMsg, GrpcControlPlane_ToLedgerMsg__Output>;

    static startupTimer: NodeJS.Timeout;


    static async start(
        logger?: ILogger,
        authorizationClient?: IAuthorizationClient,
        auditingClient?: IAuditClient,
        builtinLedgerAccountsRepo?: IBuiltinLedgerAccountsRepo,
        builtinLedgerJournalEntriesRepo?: IBuiltinLedgerJournalEntriesRepo,
        metrics?:IMetrics,
        configProvider?: IConfigProvider,
        tokenHelper?: TokenHelper,
        loginHelper?:ILoginHelper,
    ): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);

        // Logger.
        if (!logger) {
            logger = new KafkaLogger(
                BC_NAME, APP_NAME, APP_VERSION,
                kafkaProducerCommonOptions, KAFKA_LOGS_TOPIC,
                LOG_LEVEL
            );
            await (logger as KafkaLogger).init();
        }
        globalLogger = this.logger = logger;

        /// start config client - this is not mockable (can use STANDALONE MODE if desired)
        if(!configProvider) {
            // create the instance of IAuthenticatedHttpRequester
            const configLogger = this.logger.createChild("configClient");

            const authRequester = new AuthenticatedHttpRequester(configLogger, AUTH_N_SVC_TOKEN_URL);
            authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

            const messageConsumer = new MLKafkaJsonConsumer({
                ...kafkaConsumerCommonOptions,
                kafkaGroupId: `${INSTANCE_ID}_configProvider` // unique consumer group - use instance id when possible
            }, configLogger);
            configProvider = new DefaultConfigProvider(logger, authRequester, messageConsumer);
        }

        this.configClient = GetBuiltinLedgerConfigClient(configProvider, BC_NAME, APP_NAME, APP_VERSION);
        await this.configClient.init();
        await this.configClient.bootstrap(true);
        await this.configClient.fetch();

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
            const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerCommonOptions, KAFKA_AUDITS_TOPIC, auditLogger);
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
            const messageConsumer = new MLKafkaJsonConsumer({
                ...kafkaConsumerCommonOptions,
                kafkaGroupId: `${INSTANCE_ID}_authz_client`
            }, consumerHandlerLogger);

            // setup privileges - bootstrap app privs and get priv/role associations
            authorizationClient = new AuthorizationClient(
                BC_NAME, APP_NAME, APP_VERSION,
                AUTH_Z_SVC_BASEURL, logger.createChild("AuthorizationClient"),
                authRequester,
                messageConsumer
            );
            authorizationClient.addPrivilegesArray(BuiltinLedgerPrivilegesDefinition);
            await (authorizationClient as AuthorizationClient).bootstrap(true);
            await (authorizationClient as AuthorizationClient).fetch();
            // init message consumer to automatically update on role changed events
            await (authorizationClient as AuthorizationClient).init();
        }
        this.authorizationClient = authorizationClient;


        // Repos
        if (!builtinLedgerAccountsRepo) {
            builtinLedgerAccountsRepo = new BuiltinLedgerAccountsMongoRepo(
                this.logger, MONGO_URL, REDIS_HOST, REDIS_PORT
            );
            await builtinLedgerAccountsRepo.init();
        }
        this.builtinLedgerAccountsRepo = builtinLedgerAccountsRepo;

        if (!builtinLedgerJournalEntriesRepo) {
            builtinLedgerJournalEntriesRepo = new BuiltinLedgerJournalEntriesMongoRepo(
                this.logger, MONGO_URL
            );
            await builtinLedgerJournalEntriesRepo.init();
        }
        this.builtinLedgerJournalEntriesRepo = builtinLedgerJournalEntriesRepo;

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

        // token helper
        if(!tokenHelper) {
            this.logger.info(`Starting TokenHelper with jwksUrl: ${AUTH_N_SVC_JWKS_URL} issuerName: ${AUTH_N_TOKEN_ISSUER_NAME} audience: ${AUTH_N_TOKEN_AUDIENCE}`);
            tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
            await tokenHelper.init();
        }
        this.tokenHelper = tokenHelper;

        if(!loginHelper){
            loginHelper = new LoginHelper(AUTH_N_SVC_TOKEN_URL, this.logger);
            loginHelper.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
            await loginHelper.getToken(); // get an initial token (fail fast)
        }
        this.loginHelper = loginHelper;

        // Aggregate.
        const builtinLedgerAggregate: BuiltinLedgerAggregate = new BuiltinLedgerAggregate(
            this.logger,
            this.authorizationClient,
            this.auditingClient,
            this.builtinLedgerAccountsRepo,
            this.builtinLedgerJournalEntriesRepo,
            this.configClient,
            this.metrics
        );

        // gRPC server.
        this.grpcServer = new BuiltinLedgerGrpcServer(
            this.logger,
            this.tokenHelper,
            this.metrics,
            builtinLedgerAggregate,
            BUILTIN_LEDGER_URL
        );

        // start control plane channel
        await this.setupControlPlaneChannel();

        // start grpc server
        await this.grpcServer.start();

        await this.setupExpress();

        // remove startup timeout
        clearTimeout(this.startupTimer);

    }

    static setupControlPlaneChannel():Promise<void>{
        return new Promise<void>(async (resolve, reject) =>  {
            // load protos
            const protoFilePath = join(dirname(PUBLIC_TYPES_LIB_PATH), "/proto/", CONTROL_PLANE_PROTO_FILE_NAME);
            const controlPlanePackageDefinition = protoLoader.loadSync(protoFilePath, GRPC_LOAD_PROTO_OPTIONS);
            const controlPlaneProto:ControlPlaneProtoGrpcType = grpc.loadPackageDefinition(controlPlanePackageDefinition) as unknown as ControlPlaneProtoGrpcType;

            let credentials: grpc.ChannelCredentials;
            if(USE_TLS_GRPC) {
                const certDir = join(__dirname, "../../../../test_certs");
                let certFiles:IAnbGrpcCertificatesFiles = {
                    caCertFilePath: join(certDir, "ca.crt"),
                    privateKeyFilePath: join(certDir, "server.key"),
                    certChainFilePath: join(certDir, "server.crt")
                }; // instantiate data plane client
                credentials = grpc.credentials.createSsl(
                    fs.readFileSync(certFiles.caCertFilePath),
                    fs.readFileSync(certFiles.privateKeyFilePath),
                    fs.readFileSync(certFiles.certChainFilePath)
                );
            }else{
                credentials = grpc.credentials.createInsecure();
            }



            this.logger.info(`Starting control plane gRPC channel to url: ${ACCOUNTS_BALANCES_COA_SVC_URL}...`);

            // instantiate data plane client
            this.controlPlaneClient = new controlPlaneProto.aandb.controlplane.GrpcControlPlaneService(
                ACCOUNTS_BALANCES_COA_SVC_URL,
                credentials
            );

            const token = await this.loginHelper.getToken();

            const deadline: grpc.Deadline = Date.now() + GRPC_CONNECT_TIMEOUT_MS;
            this.controlPlaneClient.waitForReady(deadline, (error?: Error) => {
                if (error){
                    this.logger.error(error, `Error Starting control plane gRPC channel: ${error.message}`);
                    return reject(error);
                }
                const meta :Metadata = new Metadata();
                meta.set(GRPC_METADATA_TOKEN_FIELD_KEY, token.accessToken);

                this.controlPlaneStream = this.controlPlaneClient.LedgerStream(meta);

                const initialRespTimeout = setTimeout(()=>{
                    this.controlPlaneStream.removeListener("data", localOnDataListener);
                    this.controlPlaneStream.removeListener("error", localOnErrorListener);

                    const error =new Error("Service initControlPlane timed out while waiting for initial response from control plane");
                    this.logger.error(error);

                    return reject(error);
                }, GRPC_CONNECT_TIMEOUT_MS);

                const localOnDataListener = (data:GrpcControlPlane_ToLedgerMsg)=>{
                    // ignore other messages for now (shouldn't happen)
                    if (data.responseType !== "welcomeMsg")
                        return;

                    if (initialRespTimeout.hasRef())
                        clearTimeout(initialRespTimeout);

                    // remove local listeners and add class listeners
                    this.controlPlaneStream.removeListener("data", localOnDataListener);
                    this.controlPlaneStream.removeListener("error", localOnErrorListener);

                    // TODO move final listeners out (maybe client
                    this.controlPlaneStream.on("data", (data:GrpcControlPlane_ToLedgerMsg)=>{
                        console.log(`control plane stream on data ${data}`);
                    });
                    this.controlPlaneStream.on("end", ()=>{
                        console.log("control plane stream on end ");
                    });
                    this.controlPlaneStream.on("error", (error:Error)=>{
                        console.error(`control plane stream on error ${error}`);
                    });
                    this.controlPlaneStream.on("status", (status:grpc.status)=>{
                        console.log(`control plane stream on status ${status}`);
                    });
                    // do we need these?
                    this.controlPlaneStream.on("close", ()=>{
                        console.log("stream on close");
                    });
                    this.controlPlaneStream.on("finish", ()=>{
                        console.log("stream on finish");
                    });
                    this.logger.info("Service Control plane gRPC stream opened and initialised");

                    return resolve();
                };

                const localOnErrorListener = (error:Error)=>{
                    if (initialRespTimeout.hasRef()) clearTimeout(initialRespTimeout);
                    this.logger.error(error);
                    return reject(error);
                };

                // hook local/minimal listeners
                this.controlPlaneStream.addListener("data", localOnDataListener);
                this.controlPlaneStream.addListener("error", localOnErrorListener);

                // send GrpcControlPlane_LedgerInitialMsg
                const initialMsg: GrpcControlPlane_LedgerInitialMsg = {
                    instanceId: INSTANCE_ID,
                    address: BUILTIN_LEDGER_URL
                };
                this.controlPlaneStream.write({  initialMsg: initialMsg});
                this.logger.info("Control plane gRPC stream opened and initial message sent");
            });


        });
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
                this.logger.info(`BuiltinLedgerGrpcService v: ${APP_VERSION} started`);
                resolve();
            });
        });
    }

	static async stop(): Promise<void> {
		if (this.grpcServer !== undefined) {
			await this.grpcServer.stop();
		}
		if (this.builtinLedgerJournalEntriesRepo !== undefined) {
			await this.builtinLedgerJournalEntriesRepo.destroy();
		}
		if (this.builtinLedgerAccountsRepo !== undefined) {
			await this.builtinLedgerAccountsRepo.destroy();
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
	setTimeout(args => {
		clean_exit || process.exit(99);
	}, 5000);

	// call graceful stop routine
	await BuiltinLedgerGrpcService.stop();

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
