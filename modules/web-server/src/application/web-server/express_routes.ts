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
import {Aggregate} from "../../domain/aggregate";
import express from "express";

export class ExpressRoutes {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: Aggregate;
	// Other properties.
	private readonly _router: express.Router;
	private readonly UNKNOWN_ERROR: string = "unknown error";

	constructor(
		logger: ILogger,
		aggregate: Aggregate
	) {
		this.logger = logger;
		this.aggregate = aggregate;

		this._router = express.Router();

		this.setUp();
	}

	private setUp(): void {
		// TODO: paths.
		// Posts.
		this._router.post("/accounts", this.postAccount.bind(this)); // TODO: bind?
		this._router.post("/entries", this.postAccountEntries.bind(this)); // TODO: bind?
		// Gets.
		this._router.get("/accounts/:accountId", this.getAccountDetails.bind(this)); // TODO: bind?
		this._router.get("/accounts/:accountId", this.getAccountEntries.bind(this)); // TODO: bind?
	}

	get router(): express.Router {
		return this._router;
	}

	private async postAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.createAccount(req.body);
			res.status(200).json({
				status: "success"
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async postAccountEntries(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.createAccountEntries(req.body);
			res.status(200).json({
				status: "success"
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getAccountDetails(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accountDetails: any = await this.aggregate.getAccountDetails(req.params.accountId); // TODO: type.
			res.status(200).json({
				status: "success",
				accountDetails: accountDetails
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getAccountEntries(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accountEntries: any = await this.aggregate.getAccountEntries(req.params.accountId); // TODO: type.
			res.status(200).json({
				status: "success",
				accountEntries: accountEntries
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private sendErrorResponse(res: express.Response, statusCode: number, message: string) {
		res.status(statusCode).json({
			result: "error",
			message: message
		});
	}
}
