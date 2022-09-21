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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Aggregate} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {ExpressRoutes} from "./express_routes";
import express, {Express, json, urlencoded} from "express";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {createServer, Server} from "http";

export class ExpressHttpServer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	// Other properties.
	private static readonly ROUTER_PATH: string = "/"; // TODO: here?
	private server: Server;

	constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
		aggregate: Aggregate,
		host: string,
		portNo: number
	) {
		this.logger = logger;
		this.HOST = host;
		this.PORT_NO = portNo;

		const routes: ExpressRoutes = new ExpressRoutes(
			this.logger,
			tokenHelper,
			aggregate
		);
		const app: Express = express();
		app.use(json()); // For parsing application/json.
		app.use(urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
		app.use(ExpressHttpServer.ROUTER_PATH, routes.router);
		this.server = createServer(app);
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.listen(
				this.PORT_NO,
				this.HOST,
				() => {
					this.logger.info("* * * * * * * * * * * * * * * * * * * *");
					this.logger.info("HTTP server started 🚀");
					this.logger.info(`Host: ${this.HOST}`);
					this.logger.info(`Port: ${this.PORT_NO}`);
					this.logger.info(`Base URL: http://${this.HOST}:${this.PORT_NO}`);
					this.logger.info("* * * * * * * * * * * * * * * * * * * *");
					resolve();
				}
			).on("error", (error: Error) => {
				reject(error);
			});
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			this.server.close(() => {
				this.logger.info("* * * * * * * * * * * * * * * * * * * *");
				this.logger.info("HTTP server stopped 🏁");
				this.logger.info("* * * * * * * * * * * * * * * * * * * *");
				resolve();
			});
		});
	}
}
