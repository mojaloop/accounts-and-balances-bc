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


import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {
	AuditClient,
	KafkaAuditClientDispatcher,
	LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {existsSync} from "fs";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {AuthorizationClient, TokenHelper} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {BuiltinLedgerPrivilegesDefinition} from "./privileges";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {BuiltinLedgerGrpcServer} from "./grpc_server/grpc_server";
import {BuiltinLedgerAccountsMongoRepo} from "../implementations/builtin_ledger_accounts_mongo_repo";
import {BuiltinLedgerJournalEntriesMongoRepo} from "../implementations/builtin_ledger_journal_entries_mongo_repo";
import {BuiltinLedgerAggregate} from "../domain/aggregate";

/* ********** Constants Begin ********** */

const BC_NAME: string = "accounts-and-balances-bc";
const APP_NAME: string = "builtin-ledger-grpc-svc";
const APP_VERSION: string = process.env.npm_package_version || "0.0.1";
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;

const KAFKA_URL: string = process.env.KAFKA_URL || "localhost:9092";

const LOG_LEVEL: LogLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.DEBUG;
const KAFKA_LOGS_TOPIC = process.env.KAFKA_LOGS_TOPIC || "logs";
const KAFKA_AUDITS_TOPIC = process.env.KAFKA_AUDITS_TOPIC || "audits";

const AUTH_N_TOKEN_ISSUER_NAME = process.env.AUTH_N_TOKEN_ISSUER_NAME || "http://localhost:3201/";
const AUTH_N_SVC_BASEURL = process.env.AUTH_N_SVC_BASEURL || "http://localhost:3201";
const AUTH_N_SVC_JWKS_URL = process.env.AUTH_N_SVC_JWKS_URL || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_N_TOKEN_AUDIENCE = process.env.AUTH_N_TOKEN_AUDIENCE || "mojaloop.vnext.default_audience";

const AUTH_Z_SVC_BASEURL = process.env.AUTH_Z_SVC_BASEURL || "http://localhost:3202";

const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";


const MONGO_URL = process.env.MONGO_URL || "mongodb://root:mongoDbPas42@localhost:27017";

const BUILTIN_LEDGER_URL = process.env.BUILTIN_LEDGER_URL || "localhost:3350";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "accounts-and-balances-bc-builtinledger-grpc-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_ID"] || "superServiceSecret";


/* ********** Constants End ********** */

const kafkaProducerOptions = {
	kafkaBrokerList: KAFKA_URL
};

let globalLogger: ILogger;

export class BuiltinLedgerGrpcService {
	private static logger: ILogger;
	private static auditingClient: IAuditClient;
	private static authorizationClient: IAuthorizationClient;
	private static builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private static builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
	private static grpcServer: BuiltinLedgerGrpcServer;

	private static loggerIsChild: boolean; // TODO: avoid this.

	static async start(
		logger?: ILogger,
		authorizationClient?: IAuthorizationClient,
		auditingClient?: IAuditClient,
		builtinLedgerAccountsRepo?: IBuiltinLedgerAccountsRepo,
		builtinLedgerJournalEntriesRepo?: IBuiltinLedgerJournalEntriesRepo
	): Promise<void> {
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

		// Token helper.
		const tokenHelper: TokenHelper = new TokenHelper(
			AUTH_N_SVC_JWKS_URL,
			this.logger,
			AUTH_N_TOKEN_ISSUER_NAME,
			AUTH_N_TOKEN_AUDIENCE,
		);
		try {
			await tokenHelper.init();
		} catch (error: unknown) {
			this.logger.fatal(error);
			await this.stop();
			process.exit(-1); // TODO: verify code.
		}

		// start auditClient
		if (!auditingClient) {
			if (!existsSync(AUDIT_KEY_FILE_PATH)) {
				if (PRODUCTION_MODE) process.exit(9);
				// create e tmp file
				LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
			}
			const cryptoProvider = new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
			const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, logger);
			// NOTE: to pass the same kafka logger to the audit client, make sure the logger is started/initialised already
			auditingClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
			await auditingClient.init();
		}
		this.auditingClient = auditingClient;

		// authorization client
		if (!authorizationClient) {
			// setup privileges - bootstrap app privs and get priv/role associations
			authorizationClient = new AuthorizationClient(BC_NAME, APP_NAME, APP_VERSION, AUTH_Z_SVC_BASEURL, logger.createChild("AuthorizationClient"));
			authorizationClient.addPrivilegesArray(BuiltinLedgerPrivilegesDefinition);
			await (authorizationClient as AuthorizationClient).bootstrap(true);
			await (authorizationClient as AuthorizationClient).fetch();

		}
		this.authorizationClient = authorizationClient;


		// Repos.
		if (builtinLedgerAccountsRepo !== undefined) {
			this.builtinLedgerAccountsRepo = builtinLedgerAccountsRepo;
		} else {
			this.builtinLedgerAccountsRepo = new BuiltinLedgerAccountsMongoRepo(
				this.logger,
				MONGO_URL
			);
			try {
				await this.builtinLedgerAccountsRepo.init();
			} catch (error: unknown) {
				this.logger.fatal(error);
				await this.stop();
				process.exit(-1); // TODO: verify code.
			}
		}
		if (builtinLedgerJournalEntriesRepo !== undefined) {
			this.builtinLedgerJournalEntriesRepo = builtinLedgerJournalEntriesRepo;
		} else {
			this.builtinLedgerJournalEntriesRepo = new BuiltinLedgerJournalEntriesMongoRepo(
				this.logger,
				MONGO_URL
			);
			try {
				await this.builtinLedgerJournalEntriesRepo.init();
			} catch (error: unknown) {
				this.logger.fatal(error);
				await this.stop();
				process.exit(-1); // TODO: verify code.
			}
		}

		// Aggregate.
		const builtinLedgerAggregate: BuiltinLedgerAggregate = new BuiltinLedgerAggregate(
			this.logger,
			authorizationClient,
			this.auditingClient,
			this.builtinLedgerAccountsRepo,
			this.builtinLedgerJournalEntriesRepo
		);

		// gRPC server.
		this.grpcServer = new BuiltinLedgerGrpcServer(
			this.logger,
			tokenHelper,
			builtinLedgerAggregate,
			BUILTIN_LEDGER_URL
		);
		try {
			await this.grpcServer.start();
		} catch (error: unknown) {
			this.logger.fatal(error);
			await this.stop();
			process.exit(-1); // TODO: verify code.
		}
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
	globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
	globalLogger.error(err);
	console.log("UncaughtException - EXITING...");
	process.exit(999);
});
