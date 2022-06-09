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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Aggregate} from "../domain/aggregate";
import {ExpressWebServer} from "./web-server/express_web_server";

/* Constants. */
const SERVICE_NAME: string = "accounts and balances service";
// Web server.
const WEB_SERVER_HOST: string = process.env.SCHEDULING_HOST_SERVER ?? "localhost";
const WEB_SERVER_PORT_NO: number = parseInt(process.env.SCHEDULING_PORT_NO_SERVER ?? "") || 1234;
const WEB_SERVER_PATH_ROUTER: string = "/reminders";

// Logger.
const logger: ILogger = new ConsoleLogger();
// Domain.
const aggregate: Aggregate = new Aggregate(
	logger
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
	webServer.start();
}

async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
	logger.info(`${SERVICE_NAME} - ${signal} received, cleaning up...`);
	process.exit();
}

// SIGINT (Ctrl + c).
process.on("SIGINT", handleIntAndTermSignals.bind(this));
// SIGTERM.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
// Exit.
process.on("exit", () => {
	logger.info(`${SERVICE_NAME} - exiting...`);
});

start();
