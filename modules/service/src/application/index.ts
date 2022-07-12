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

import {AppConfiguration, IConfigProvider, DefaultConfigProvider} from "@mojaloop/platform-configuration-bc-client-lib";
import {ConfigParameterTypes} from "@mojaloop/platform-configuration-bc-types-lib";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {Aggregate} from "../domain/aggregate";
import {ExpressWebServer} from "./web-server/express_web_server";
import {MongoRepo} from "../infrastructure/mongo_repo";
import {IRepo} from "../domain/infrastructure-interfaces/irepo";

/* Constants. */
const SERVICE_NAME: string = "Accounts and Balances Web Server";
const SERVICE_VERSION: string = "0.1.1";
// Web server.
const WEB_SERVER_HOST: string =
	process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_HOST ?? "localhost";
const WEB_SERVER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_WEB_SERVER_PORT_NO ?? "") || 1234;
const WEB_SERVER_PATH_ROUTER: string = "/"; // TODO.
// Repo.
const REPO_HOST: string =
	process.env.ACCOUNTS_AND_BALANCES_REPO_HOST ?? "localhost";
const REPO_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_REPO_PORT_NO ?? "") || 27017;
const REPO_URL: string = `mongodb://${REPO_HOST}:${REPO_PORT_NO}`;
const DB_NAME: string = "AccountsAndBalances";
const ACCOUNTS_COLLECTION_NAME: string = "Accounts";
const JOURNAL_ENTRIES_COLLECTION_NAME: string = "JournalEntries";

// Platform configuration. TODO.
/*const appConfiguration = new AppConfiguration(
	"", // TODO.
	"", // TODO.
	SERVICE_NAME,
	SERVICE_VERSION,
	null // Standalone mode.
);*/
// Logger.
const logger: ILogger = new DefaultLogger( // TODO.
	"", // TODO.
	SERVICE_NAME, // TODO.
	SERVICE_VERSION,
	LogLevel.INFO); // TODO.
// Infrastructure.
const repo: IRepo = new MongoRepo(
	logger,
	REPO_URL,
	DB_NAME,
	ACCOUNTS_COLLECTION_NAME,
	JOURNAL_ENTRIES_COLLECTION_NAME
);
// Domain.
const aggregate: Aggregate = new Aggregate(
	logger,
	repo
);
// Application.
const webServer: ExpressWebServer = new ExpressWebServer(
	logger,
	WEB_SERVER_HOST,
	WEB_SERVER_PORT_NO,
	WEB_SERVER_PATH_ROUTER,
	aggregate
);

async function start(): Promise<void> {
	// await appConfiguration.fetch(); // TODO.
	await aggregate.init(); // No need to handle exceptions.
	webServer.start(); // No need to handle exceptions.
}

process.on("SIGINT", handleIntAndTermSignals.bind(this)); // Ctrl + c.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
	logger.info(`${signal} received`);
	await aggregate.destroy();
	process.exit();
}
process.on("exit", () => {
	logger.info(`exiting ${SERVICE_NAME}`);
});

start();
