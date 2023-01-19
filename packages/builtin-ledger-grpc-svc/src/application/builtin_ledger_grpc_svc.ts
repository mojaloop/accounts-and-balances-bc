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
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "../domain/infrastructure";
import {GrpcServer} from "./grpc_server/grpc_server";
import {BuiltinLedgerAccountsMongoRepo} from "../implementations/builtin_ledger_accounts_mongo_repo";
import {BuiltinLedgerJournalEntriesMongoRepo} from "../implementations/builtin_ledger_journal_entries_mongo_repo";
import {BuiltinLedgerAggregate} from "../domain/aggregate";
import {Privileges} from "../domain/privileges";
import {resolve} from "path";

/* ********** Constants Begin ********** */

const BC_NAME: string = "accounts-and-balances-bc";
const SVC_NAME: string = "builtin-ledger-grpc-svc";
const SVC_VERSION: string = process.env.npm_package_version || "0.0.1"; // TODO: is this correct?

const KAFKA_URL: string = process.env.KAFKA_URL || "localhost:9092";

const LOG_LEVEL: LogLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.DEBUG;
const KAFKA_LOGS_TOPIC: string = process.env.KAFKA_LOGS_TOPIC || "logs";

const AUTH_N_TOKEN_ISSUER_NAME = process.env.AUTH_N_TOKEN_ISSUER_NAME || "http://localhost:3201/";
const AUTH_N_SVC_BASEURL = process.env.AUTH_N_SVC_BASEURL || "http://localhost:3201";
const AUTH_N_SVC_JWKS_URL = process.env.AUTH_N_SVC_JWKS_URL || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_N_TOKEN_AUDIENCE = process.env.AUTH_N_TOKEN_AUDIENCE || "mojaloop.vnext.default_audience";

const AUTH_Z_SVC_BASEURL = process.env.AUTH_Z_SVC_BASEURL || "http://localhost:3202";

const AUDIT_KEY_FILE_RELATIVE_PATH: string = "../../../../certs/audit_private_key.pem";
const AUDIT_KEY_FILE_PATH = process.env.AUDIT_KEY_FILE_PATH || resolve(__dirname, AUDIT_KEY_FILE_RELATIVE_PATH);
const KAFKA_AUDITS_TOPIC = process.env.KAFKA_AUDITS_TOPIC || "audits";

const MONGO_URL: string = process.env.MONGO_URL || "mongodb://root:mongoDbPas42@localhost:27017";

const BUILTIN_LEDGER_URL: string = process.env.BUILTIN_LEDGER_URL || "localhost:5678";

/* ********** Constants End ********** */

export class BuiltinLedgerGrpcService {
	private static logger: ILogger;
	private static auditingClient: IAuditClient;
	private static builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private static builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
	private static grpcServer: GrpcServer;

	private static loggerIsChild: boolean; // TODO: avoid this.

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
			this.loggerIsChild = true;
		} else {
			this.logger = new KafkaLogger(
				BC_NAME,
				SVC_NAME,
				SVC_VERSION,
				{kafkaBrokerList: KAFKA_URL},
				KAFKA_LOGS_TOPIC,
				LOG_LEVEL
			);
			this.loggerIsChild = false;
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
			AUTH_N_TOKEN_ISSUER_NAME,
			AUTH_N_SVC_JWKS_URL,
			AUTH_N_TOKEN_AUDIENCE,
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
				BC_NAME,
				SVC_NAME,
				SVC_VERSION,
				AUTH_Z_SVC_BASEURL,
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
			if (!existsSync(AUDIT_KEY_FILE_PATH)) {
				LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH);
			}
			const cryptoProvider: LocalAuditClientCryptoProvider =
				new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
			const auditDispatcher: KafkaAuditClientDispatcher = new KafkaAuditClientDispatcher(
				{kafkaBrokerList: KAFKA_URL},
				KAFKA_AUDITS_TOPIC,
				this.logger
			);
			this.auditingClient = new AuditClient(
				BC_NAME,
				SVC_NAME,
				SVC_VERSION,
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
		this.grpcServer = new GrpcServer(
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
	console.info(`exiting ${SVC_NAME}`);
});
