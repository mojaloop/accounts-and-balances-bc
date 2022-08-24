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
import {Aggregate} from "@mojaloop/accounts-and-balances-bc-domain";
import {ExpressRoutes} from "./express_routes";
import express from "express";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import http from "http";

export class ExpressWebServer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	private readonly PATH_ROUTER: string;
	// Other properties.
	private readonly BASE_URL: string;
	private readonly app: express.Express;
	private readonly routes: ExpressRoutes;
	private webServer: http.Server; // TODO: type.

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		pathRouter: string,
		tokenHelper: TokenHelper,
		aggregate: Aggregate
	) {
		this.logger = logger;
		this.HOST = host;
		this.PORT_NO = portNo;
		this.PATH_ROUTER = pathRouter;

		this.BASE_URL = `http://${this.HOST}:${this.PORT_NO}`;
		this.app = express();
		this.routes = new ExpressRoutes(
			logger,
			tokenHelper,
			aggregate
		);

		this.configure();
	}

	private configure() {
		this.app.use(express.json()); // For parsing application/json.
		this.app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
		this.app.use(this.PATH_ROUTER, this.routes.router);
	}

	// TODO: name; async?
	public init(): void {
		try {
			this.webServer = this.app.listen(this.PORT_NO, () => {
				this.logger.info("Server on 🚀");
				this.logger.info(`Host: ${this.HOST}`);
				this.logger.info(`Port: ${this.PORT_NO}`);
				this.logger.info(`Base URL: ${this.BASE_URL}`);
			});
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	// TODO: name; async?
	public destroy(): void {
		this.webServer.close();
	}
}
