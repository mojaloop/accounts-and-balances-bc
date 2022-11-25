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
	AuditClient,
	KafkaAuditClientDispatcher,
	LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {existsSync} from "fs";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {AuthorizationClient, TokenHelper} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {resolve} from "path";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {GrpcServer} from "./grpc_server/grpc_server";
import {BuiltinLedgerAccountsMongoRepo} from "../implementations/builtin_ledger_accounts_mongo_repo";
import {BuiltinLedgerJournalEntriesMongoRepo} from "../implementations/builtin_ledger_journal_entries_mongo_repo";
import {BuiltinLedgerAggregate} from "../domain/aggregate";
import {Privileges} from "../domain/privileges";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "accounts-and-balances-bc";
const SERVICE_NAME: string = "builtin-ledger-grpc-svc";
const SERVICE_VERSION: string = require("package.json").version; // TODO: should this be done?

// Event streamer.
const EVENT_STREAMER_HOST: string = process.env["ACCOUNTS_AND_BALANCES_BC_EVENT_STREAMER_HOST"] ?? "localhost";
const EVENT_STREAMER_PORT_NO: number =
	parseInt(process.env["ACCOUNTS_AND_BALANCES_BC_EVENT_STREAMER_PORT_NO"] ?? "") || 9092;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.INFO;
const LOGGING_TOPIC: string = process.env["ACCOUNTS_AND_BALANCES_BC_LOGGING_TOPIC"] ?? "logs";

// Token helper. TODO: names and values.
const TOKEN_HELPER_ISSUER_NAME: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_TOKEN_HELPER_ISSUER_NAME"] ?? "http://localhost:3201/";
const TOKEN_HELPER_JWKS_URL: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_TOKEN_HELPER_JWKS_URL"] ?? "http://localhost:3201/.well-known/jwks.json";
const TOKEN_HELPER_AUDIENCE: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_TOKEN_HELPER_AUDIENCE"] ?? "mojaloop.vnext.default_audience";

// Authorization.
const AUTHORIZATION_SERVICE_HOST: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_AUTHORIZATION_SERVICE_HOST"] ?? "localhost";
const AUTHORIZATION_SERVICE_PORT_NO: number =
	parseInt(process.env["ACCOUNTS_AND_BALANCES_BC_AUTHORIZATION_SERVICE_PORT_NO"] ?? "") || 3202;

// Auditing.
const AUDITING_CERT_FILE_RELATIVE_PATH: string = "../../../certs/auditing.crt";
const AUDITING_CERT_FILE_ABSOLUTE_PATH: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_AUDITING_CERT_FILE_ABSOLUTE_PATH"]
	?? resolve(__dirname, AUDITING_CERT_FILE_RELATIVE_PATH);
const AUDITING_TOPIC: string = process.env["ACCOUNTS_AND_BALANCES_BC_AUDITING_TOPIC"] ?? "audits";

// Repositories.
const MONGO_HOST: string = process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_HOST"] ?? "localhost";
const MONGO_PORT_NO: number = parseInt(process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_PORT_NO"] ?? "") || 27017;
const MONGO_TIMEOUT_MS: number =
	parseInt(process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_TIMEOUT_MS"] ?? "") || 5000;
const MONGO_USERNAME: string = process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_USERNAME"] ?? "accounts-and-balances-bc";
const MONGO_PASSWORD: string = process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_PASSWORD"] ?? "123456789";
const MONGO_DB_NAME: string = process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_DB_NAME"] ?? "accounts_and_balances_bc";
const MONGO_ACCOUNTS_COLLECTION_NAME: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_ACCOUNTS_COLLECTION_NAME"] ?? "accounts";
const MONGO_JOURNAL_ENTRIES_COLLECTION_NAME: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_MONGO_JOURNAL_ENTRIES_COLLECTION_NAME"] ?? "journal_entries";

// Built-in Ledger gRPC Service.
const BUILTIN_LEDGER_GRPC_SERVICE_HOST: string =
	process.env["ACCOUNTS_AND_BALANCES_BC_BUILTIN_LEDGER_GRPC_SERVICE_HOST"] ?? "localhost";
const BUILTIN_LEDGER_GRPC_SERVICE_PORT_NO: number =
	parseInt(process.env["ACCOUNTS_AND_BALANCES_BC_BUILTIN_LEDGER_GRPC_SERVICE_PORT_NO"] ?? "") || 5678;

/* ********** Constants End ********** */

export class BuiltinLedgerGrpcService {
	private static logger: ILogger;
	private static auditingClient: IAuditClient;
	private static builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private static builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
	private static grpcServer: GrpcServer;

	static async start(
		logger?: ILogger,
		authorizationClient?: IAuthorizationClient,
		auditingClient?: IAuditClient,
		builtinLedgerAccountsRepo?: IBuiltinLedgerAccountsRepo,
		builtinLedgerJournalEntriesRepo?: IBuiltinLedgerJournalEntriesRepo
	): Promise<void> {
		// Logger.
		if (logger !== undefined) {
			this.logger = logger.createChild(this.name);
		} else {
			this.logger = new KafkaLogger(
				BOUNDED_CONTEXT_NAME,
				SERVICE_NAME,
				SERVICE_VERSION,
				{kafkaBrokerList: `${EVENT_STREAMER_HOST}:${EVENT_STREAMER_PORT_NO}`},
				LOGGING_TOPIC,
				LOGGING_LEVEL
			);
			try {
				await (this.logger as KafkaLogger).init();
			} catch (error: unknown) {
				console.error(error); // TODO: use console?
				await this.stop();
				process.exit(-1); // TODO: verify code.
			}
		}

		// Token helper.
		const tokenHelper: TokenHelper = new TokenHelper(
			TOKEN_HELPER_ISSUER_NAME,
			TOKEN_HELPER_JWKS_URL,
			TOKEN_HELPER_AUDIENCE,
			this.logger
		);
		try {
			await tokenHelper.init();
		} catch (error: unknown) {
			this.logger.fatal(error);
			await this.stop();
			process.exit(-1); // TODO: verify code.
		}

		// Authorization.
		if (authorizationClient === undefined) {
			authorizationClient = new AuthorizationClient(
				BOUNDED_CONTEXT_NAME,
				SERVICE_NAME,
				SERVICE_VERSION,
				`http://${AUTHORIZATION_SERVICE_HOST}:${AUTHORIZATION_SERVICE_PORT_NO}`,
				this.logger
			);
			this.addPrivileges(authorizationClient as AuthorizationClient);
			await (authorizationClient as AuthorizationClient).bootstrap(true);
			await (authorizationClient as AuthorizationClient).fetch();
		}

		// Auditing.
		if (auditingClient !== undefined) {
			this.auditingClient = auditingClient;
		} else {
			if (!existsSync(AUDITING_CERT_FILE_ABSOLUTE_PATH)) {
				LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDITING_CERT_FILE_ABSOLUTE_PATH);
			}
			const cryptoProvider: LocalAuditClientCryptoProvider =
				new LocalAuditClientCryptoProvider(AUDITING_CERT_FILE_ABSOLUTE_PATH);
			const auditDispatcher: KafkaAuditClientDispatcher = new KafkaAuditClientDispatcher(
				{kafkaBrokerList: `${EVENT_STREAMER_HOST}:${EVENT_STREAMER_PORT_NO}`},
				AUDITING_TOPIC,
				this.logger
			);
			this.auditingClient = new AuditClient(
				BOUNDED_CONTEXT_NAME,
				SERVICE_NAME,
				SERVICE_VERSION,
				cryptoProvider,
				auditDispatcher
			);
			try {
				await this.auditingClient.init();
			} catch (error: unknown) {
				this.logger.fatal(error);
				await this.stop();
				process.exit(-1); // TODO: verify code.
			}
		}

		// Repos.
		if (builtinLedgerAccountsRepo !== undefined) {
			this.builtinLedgerAccountsRepo = builtinLedgerAccountsRepo;
		} else {
			this.builtinLedgerAccountsRepo = new BuiltinLedgerAccountsMongoRepo(
				this.logger,
				MONGO_HOST,
				MONGO_PORT_NO,
				MONGO_TIMEOUT_MS,
				MONGO_USERNAME,
				MONGO_PASSWORD,
				MONGO_DB_NAME,
				MONGO_ACCOUNTS_COLLECTION_NAME
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
				MONGO_HOST,
				MONGO_PORT_NO,
				MONGO_TIMEOUT_MS,
				MONGO_USERNAME,
				MONGO_PASSWORD,
				MONGO_DB_NAME,
				MONGO_JOURNAL_ENTRIES_COLLECTION_NAME
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
		this.grpcServer = new GrpcServer(
			this.logger,
			tokenHelper,
			builtinLedgerAggregate,
			BUILTIN_LEDGER_GRPC_SERVICE_HOST,
			BUILTIN_LEDGER_GRPC_SERVICE_PORT_NO
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
		if (this.logger instanceof KafkaLogger) {
			await this.logger.destroy();
		}
	}

	private static addPrivileges(authorizationClient: AuthorizationClient): void {
		authorizationClient.addPrivilege(
			Privileges.CREATE_ACCOUNT,
			"CREATE_ACCOUNT",
			"Allows for the creation of accounts." // TODO: verify.
		);
		authorizationClient.addPrivilege(
			Privileges.CREATE_JOURNAL_ENTRY,
			"CREATE_JOURNAL_ENTRY",
			"Allows for the creation of journal entries." // TODO: verify.
		);
		authorizationClient.addPrivilege(
			Privileges.VIEW_ACCOUNT,
			"VIEW_ACCOUNT",
			"Allows for the retrieval of accounts." // TODO: verify.
		);
		authorizationClient.addPrivilege(
			Privileges.VIEW_JOURNAL_ENTRY,
			"VIEW_JOURNAL_ENTRY",
			"Allows for the retrieval of journal entries." // TODO: verify.
		);
	}
}

async function handleSignals(signal: NodeJS.Signals): Promise<void> {
	console.info(`${signal} received`); // TODO: use console?
	await BuiltinLedgerGrpcService.stop();
	process.exit();
}

process.on("SIGINT", handleSignals); // SIGINT = 2 (Ctrl + c).
process.on("SIGTERM", handleSignals); // SIGTERM = 15.
process.on("exit", () => {
	console.info(`exiting ${SERVICE_NAME}`);
});
