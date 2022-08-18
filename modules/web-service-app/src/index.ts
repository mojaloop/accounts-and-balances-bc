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


import {LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {Aggregate, IAccountsRepo, IJournalEntriesRepo} from "@mojaloop/accounts-and-balances-bc-domain";
import {ExpressWebServer} from "./web-server/express_web_server";
import {MongoJournalEntriesRepo} from "./infrastructure/mongo_journal_entries_repo";
import {MongoAccountsRepo} from "./infrastructure/mongo_accounts_repo";
import {
	AuditClient,
	KafkaAuditClientDispatcher,
	LocalAuditClientCryptoProvider,
	IAuditClientCryptoProvider,
	IAuditClientDispatcher
} from "@mojaloop/auditing-bc-client-lib";
import {MLKafkaProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {existsSync} from "fs"; // TODO: fs promises?
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "web-server-svc";
const SERVICE_VERSION: string = "0.0.1";

// Message broker.
const MESSAGE_BROKER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST ?? "localhost";
const MESSAGE_BROKER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO ?? "") || 9092;
const MESSAGE_BROKER_URL: string = `${MESSAGE_BROKER_HOST}:${MESSAGE_BROKER_PORT_NO}`;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.ERROR;
const LOGGING_TOPIC: string = `${BOUNDED_CONTEXT_NAME}_${SERVICE_NAME}_logging`;

// Token helper. TODO: names.
const AUTH_Z_TOKEN_ISSUER_NAME: string =
	process.env.ACCOUNTS_AND_BALANCES_AUTH_Z_TOKEN_ISSUER_NAME ?? "http://localhost:3201/";
const AUTH_Z_TOKEN_AUDIENCE: string =
	process.env.ACCOUNTS_AND_BALANCES_AUTH_Z_TOKEN_AUDIENCE ?? "mojaloop.vnext.default_audience";
const AUTH_Z_SVC_JWKS_URL: string =
	process.env.ACCOUNTS_AND_BALANCES_AUTH_Z_SVC_JWKS_URL ?? "http://localhost:3201/.well-known/jwks.json";

// Auditing.
const AUDITING_CERT_FILE_PATH: string = process.env.AUDITING_CERT_FILE_PATH ?? "./auditing_cert"; // TODO: file name.
const AUDITING_TOPIC: string = `${SERVICE_NAME} - Auditing`;

// Data base.
const DB_HOST: string = process.env.ACCOUNTS_AND_BALANCES_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "accounts-and-balances";
const ACCOUNTS_COLLECTION_NAME: string = "accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "journal-entries";

// Web server.
const WEB_SERVER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_HOST ?? "localhost";
const WEB_SERVER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_PORT_NO ?? "") || 1234;
const WEB_SERVER_PATH_ROUTER: string = "/";

/* ********** Constants End ********** */

// Global variables.
let logger: KafkaLogger; // TODO: ILogger?
let aggregate: Aggregate;

async function main(): Promise<void> {
	// Message producer options.
	const kafkaProducerOptions: MLKafkaProducerOptions = {
		kafkaBrokerList: MESSAGE_BROKER_URL
		// TODO: producerClientId?
	}

	// Logger.
	logger = new KafkaLogger( // TODO: is this the logger to use?
		BOUNDED_CONTEXT_NAME,
		SERVICE_NAME,
		SERVICE_VERSION,
		kafkaProducerOptions,
		LOGGING_TOPIC,
		LOGGING_LEVEL
	);
	await logger.start(); // TODO: here or on the aggregate?

	// Token helper.
	/*const tokenHelper: TokenHelper = new TokenHelper( // TODO: no interface?
		AUTH_Z_TOKEN_ISSUER_NAME,
		AUTH_Z_SVC_JWKS_URL,
		AUTH_Z_TOKEN_AUDIENCE,
		logger
	);
	await tokenHelper.init();*/

	// Auditing.
	if (!existsSync(AUDITING_CERT_FILE_PATH)) { // TODO: clarify.
		// TODO: clarify.
		/*if (PRODUCTION_MODE) {
			process.exit(9);
		}*/
		// Create e tmp file. TODO: clarify.
		LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDITING_CERT_FILE_PATH, 2048); // TODO: Put this in a constant.
	}
	const cryptoProvider: IAuditClientCryptoProvider = new LocalAuditClientCryptoProvider(AUDITING_CERT_FILE_PATH); // TODO: type.
	const auditDispatcher: IAuditClientDispatcher =
		new KafkaAuditClientDispatcher(kafkaProducerOptions, AUDITING_TOPIC, logger); // TODO: type.
	const auditingClient: IAuditClient = new AuditClient( // TODO: type.
		BOUNDED_CONTEXT_NAME,
		SERVICE_NAME,
		SERVICE_VERSION,
		cryptoProvider,
		auditDispatcher
	);

	// Repos.
	const accountsRepo: IAccountsRepo = new MongoAccountsRepo(
		logger,
		DB_URL,
		DB_NAME,
		ACCOUNTS_COLLECTION_NAME
	);
	const journalEntriesRepo: IJournalEntriesRepo = new MongoJournalEntriesRepo(
		logger,
		DB_URL,
		DB_NAME,
		JOURNAL_ENTRIES_COLLECTION_NAME
	);

	// Aggregate.
	aggregate = new Aggregate(
		logger,
		auditingClient,
		accountsRepo,
		journalEntriesRepo
	);
	await aggregate.init(); // No need to handle exceptions.

	// Web server.
	const webServer: ExpressWebServer = new ExpressWebServer(
		logger,
		WEB_SERVER_HOST,
		WEB_SERVER_PORT_NO,
		WEB_SERVER_PATH_ROUTER,
		// tokenHelper,
		aggregate
	);
	webServer.start(); // No need to handle exceptions.
}

process.on("SIGINT", handleIntAndTermSignals.bind(this)); // Ctrl + c.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
	logger.info(`${signal} received`);
	await aggregate.destroy();
	await logger.destroy(); // TODO: here or on the aggregate?
	process.exit();
}
process.on("exit", () => {
	logger.info(`exiting ${SERVICE_NAME}`);
});

main();
