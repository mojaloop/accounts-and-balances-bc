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

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {
	Aggregate,
	IAccountsRepo,
	IJournalEntriesRepo,
	Privileges
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {MongoAccountsRepo, MongoJournalEntriesRepo} from "@mojaloop/accounts-and-balances-bc-infrastructure-lib";
import {
	AuditClient,
	KafkaAuditClientDispatcher,
	LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {MLKafkaProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {existsSync} from "fs";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {AuthorizationClient, TokenHelper} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {ExpressHttpServer} from "./express_http_server";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "http-svc";
const SERVICE_VERSION: string = "0.0.1";

// Message broker.
const MESSAGE_BROKER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST ?? "localhost";
const MESSAGE_BROKER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO ?? "") || 9092;
const MESSAGE_BROKER_URL: string = `${MESSAGE_BROKER_HOST}:${MESSAGE_BROKER_PORT_NO}`;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.INFO;
const LOGGING_TOPIC: string = process.env.ACCOUNTS_AND_BALANCES_LOGGING_TOPIC ?? "logs";

// Token helper. TODO: names and values.
const TOKEN_HELPER_ISSUER_NAME: string =
	process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_ISSUER_NAME ?? "http://localhost:3201/";
const TOKEN_HELPER_JWKS_URL: string =
	process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_JWKS_URL ?? "http://localhost:3201/.well-known/jwks.json";
const TOKEN_HELPER_AUDIENCE: string =
	process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_AUDIENCE ?? "mojaloop.vnext.default_audience";

// Authorization.
const AUTHORIZATION_SERVICE_HOST: string = "localhost";
const AUTHORIZATION_SERVICE_PORT_NO: number = 3202;
const BASE_URL_AUTHORIZATION_SERVICE: string
	= process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_AUDIENCE
	?? `http://${AUTHORIZATION_SERVICE_HOST}:${AUTHORIZATION_SERVICE_PORT_NO}`;

// Auditing.
const AUDITING_CERT_FILE_PATH: string =
	process.env.ACCOUNTS_AND_BALANCES_AUDITING_CERT_FILE_PATH ?? "./auditing_cert"; // TODO: file name.
const AUDITING_TOPIC: string = process.env.ACCOUNTS_AND_BALANCES_AUDITING_TOPIC ?? "audits";

// Data base.
const DB_HOST: string = process.env.ACCOUNTS_AND_BALANCES_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "accounts-and-balances";
const ACCOUNTS_COLLECTION_NAME: string = "accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "journal-entries";

// Server.
const HTTP_SERVER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_HTTP_SERVER_HOST || "localhost";
const HTTP_SERVER_PORT_NO: number = parseInt(process.env.ACCOUNTS_AND_BALANCES_HTTP_SERVER_PORT_NO || "") || 1234;

/* ********** Constants End ********** */

let logger: ILogger;
let auditingClient: IAuditClient;
let accountsRepo: IAccountsRepo;
let journalEntriesRepo: IJournalEntriesRepo;
let httpServer: ExpressHttpServer;

export async function start(
	_logger?: ILogger,
	authorizationClient?: IAuthorizationClient,
	_auditingClient?: IAuditClient,
	_accountsRepo?: IAccountsRepo,
	_journalEntriesRepo?: IJournalEntriesRepo
): Promise<void> {
	// Message producer options.
	const kafkaProducerOptions: MLKafkaProducerOptions = {
		kafkaBrokerList: MESSAGE_BROKER_URL
	};

	// Logger.
	if (_logger !== undefined) {
		logger = _logger;
	} else {
		logger = new KafkaLogger(
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			kafkaProducerOptions,
			LOGGING_TOPIC,
			LOGGING_LEVEL
		);
		try {
			await (logger as KafkaLogger).start();
		} catch (e: unknown) {
			logger.fatal(e);
			await stop();
			process.exit(-1); // TODO: verify code.
		}
	}

	// Token helper.
	const tokenHelper: TokenHelper = new TokenHelper(
		TOKEN_HELPER_ISSUER_NAME,
		TOKEN_HELPER_JWKS_URL,
		TOKEN_HELPER_AUDIENCE,
		logger
	);
	try {
		await tokenHelper.init();
	} catch (e: unknown) {
		logger.fatal(e);
		await stop();
		process.exit(-1); // TODO: verify code.
	}

	// Authorization.
	if (authorizationClient === undefined) {
		authorizationClient = new AuthorizationClient(
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			BASE_URL_AUTHORIZATION_SERVICE,
			logger
		);
		addPrivileges(authorizationClient as AuthorizationClient);
		await (authorizationClient as AuthorizationClient).bootstrap(true);
		await (authorizationClient as AuthorizationClient).fetch();
	}

	// Auditing.
	if (_auditingClient !== undefined) {
		auditingClient = _auditingClient;
	} else {
		if (!existsSync(AUDITING_CERT_FILE_PATH)) {
			// TODO: clarify.
			/*if (PRODUCTION_MODE) {
				process.exit(9); // TODO: verify code.
			}*/
			LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDITING_CERT_FILE_PATH, 2048); // TODO: Put this in a constant.
		}
		const cryptoProvider: LocalAuditClientCryptoProvider =
			new LocalAuditClientCryptoProvider(AUDITING_CERT_FILE_PATH);
		const auditDispatcher: KafkaAuditClientDispatcher =
			new KafkaAuditClientDispatcher(kafkaProducerOptions, AUDITING_TOPIC, logger);
		auditingClient = new AuditClient(
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			cryptoProvider,
			auditDispatcher
		);
		try {
			await auditingClient.init();
		} catch (e: unknown) {
			logger.fatal(e);
			await stop();
			process.exit(-1); // TODO: verify code.
		}
	}

	// Repos.
	if (_accountsRepo !== undefined) {
		accountsRepo = _accountsRepo;
	} else {
		accountsRepo = new MongoAccountsRepo(
			logger,
			DB_URL,
			DB_NAME,
			ACCOUNTS_COLLECTION_NAME
		);
		try {
			await accountsRepo.init();
		} catch (e: unknown) {
			logger.fatal(e);
			await stop();
			process.exit(-1); // TODO: verify code.
		}
	}
	if (_journalEntriesRepo !== undefined) {
		journalEntriesRepo = _journalEntriesRepo;
	} else {
		journalEntriesRepo = new MongoJournalEntriesRepo(
			logger,
			DB_URL,
			DB_NAME,
			JOURNAL_ENTRIES_COLLECTION_NAME
		);
		try {
			await journalEntriesRepo.init();
		} catch (e: unknown) {
			logger.fatal(e);
			await stop();
			process.exit(-1); // TODO: verify code.
		}
	}

	// Aggregate.
	const aggregate: Aggregate = new Aggregate(
		logger,
		authorizationClient,
		auditingClient,
		accountsRepo,
		journalEntriesRepo
	);

	// HTTP server.
	httpServer = new ExpressHttpServer(
		logger,
		tokenHelper,
		aggregate,
		HTTP_SERVER_HOST,
		HTTP_SERVER_PORT_NO
	);
	try {
		await httpServer.start();
	} catch (e: unknown) {
		logger.fatal(e);
		await stop();
		process.exit(-1); // TODO: verify code.
	}
}

function addPrivileges(authorizationClient: AuthorizationClient): void {
	authorizationClient.addPrivilege(
		Privileges.CREATE_ACCOUNT,
		"CREATE_ACCOUNT",
		"Allows the creation of accounts." // TODO: verify.
	);
	authorizationClient.addPrivilege(
		Privileges.CREATE_JOURNAL_ENTRY,
		"CREATE_JOURNAL_ENTRY",
		"Allows the creation of journal entries." // TODO: verify.
	);
	authorizationClient.addPrivilege(
		Privileges.VIEW_ACCOUNT,
		"VIEW_ACCOUNT",
		"Allows the retrieval of accounts." // TODO: verify.
	);
	authorizationClient.addPrivilege(
		Privileges.VIEW_JOURNAL_ENTRY,
		"VIEW_JOURNAL_ENTRY",
		"Allows the retrieval of journal entries." // TODO: verify.
	);
}

// TODO: verify ifs.
export async function stop() {
	if (httpServer) {
		await httpServer.stop();
	}
	if (accountsRepo) {
		await accountsRepo.destroy();
	}
	if (journalEntriesRepo) {
		await journalEntriesRepo.destroy();
	}
	if (auditingClient) {
		await auditingClient.destroy();
	}
	if (logger instanceof KafkaLogger) {
		await logger.destroy();
	}
}

process.on("SIGINT", handleIntAndTermSignals.bind(this)); // Ctrl + c.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
	logger.info(`${signal} received`);
	await stop();
	process.exit(); // TODO: required? exit code.
}
process.on("exit", () => {
	console.info(`${SERVICE_NAME} exited`);
});
