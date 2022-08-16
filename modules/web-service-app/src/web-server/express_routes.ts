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
import express from "express";
import {
	Aggregate,
	AccountAlreadyExistsError,
	InvalidAccountStateError,
	InvalidAccountTypeError,
	InvalidBalanceError,
	InvalidCreditBalanceError,
	InvalidDebitBalanceError,
	InvalidJournalEntryAmountError,
	JournalEntryAlreadyExistsError,
	IAccount,
	IJournalEntry
} from "@mojaloop/accounts-and-balances-bc-domain";
import {TokenHelper, CallSecurityContext} from "@mojaloop/security-bc-client-lib";

const BEARER_LENGTH: number = 2; // TODO: why 2?

// Extend express request to include our security fields. TODO: clarify.
declare module "express-serve-static-core" {
	export interface Request {
		securityContext: CallSecurityContext | null;
	}
}

export class ExpressRoutes {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly tokenHelper: TokenHelper;
	private readonly aggregate: Aggregate;
	// Other properties.
	private readonly _router: express.Router;
	private readonly UNKNOWN_ERROR: string = "unknown error";

	constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
		aggregate: Aggregate
	) {
		this.logger = logger;
		this.tokenHelper = tokenHelper;
		this.aggregate = aggregate;

		this._router = express.Router();

		this.setUp();
	}

	private setUp(): void {
		// Inject authentication - all requests require a valid token. TODO: clarify.
		this._router.use(this.authenticationMiddleware.bind(this));
		// Posts.
		this._router.post("/accounts", this.postAccount.bind(this));
		this._router.post("/journalEntries", this.postJournalEntries.bind(this));
		// Gets.
		this._router.get("/accounts", this.accounts.bind(this)); // TODO: function name.
		this._router.get("/journalEntries", this.journalEntries.bind(this)); // TODO: function name.
	}

	get router(): express.Router {
		return this._router;
	}

	// TODO: function name; express.NextFunction; clarify; why returns? logs vs error responses.
	private async authenticationMiddleware(
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	): Promise<void> {
		const authorizationHeader: string | undefined = req.headers["authorization"]; // TODO: type.
		if (authorizationHeader === undefined) {
			this.sendErrorResponse(
				res,
				403,
				"" // TODO: message.
			);
			return;
		}

		const bearer: string[] = authorizationHeader.trim().split(" "); // TODO: name.
		if (bearer.length != BEARER_LENGTH) {
			this.sendErrorResponse(
				res,
				403,
				"" // TODO: message.
			);
			return;
		}

		const bearerToken: string = bearer[1];
		let verified: boolean;
		try {
			verified = await this.tokenHelper.verifyToken(bearerToken);
		} catch (e: unknown) {
			this.logger.error(e);
			this.sendErrorResponse(
				res,
				403,
				"" // TODO: message.
			);
			return;
		}
		if (!verified) {
			this.sendErrorResponse(
				res,
				403,
				"" // TODO: message.
			);
			return;
		}

		const decodedToken: any = this.tokenHelper.decodeToken(bearerToken); // TODO: type.
		if (decodedToken.sub === undefined // TODO: undefined?
			|| decodedToken.sub === null // TODO: null?
			|| decodedToken.sub.indexOf("::") == -1) { // TODO: Put -1 in a constant.
			this.sendErrorResponse(
				res,
				403,
				"" // TODO: message.
			);
			return;
		}

		const subSplit = decodedToken.sub.split("::"); // TODO: type.
		const subjectType = subSplit[0]; // TODO: type.
		const subject = subSplit[1]; // TODO: type.

		req.securityContext = {
			accessToken: bearerToken,
			clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null,
			username: subjectType.toUpperCase().startsWith("USER") ? subject : null,
			rolesIds: decodedToken.roles
		};

		next();
	}

	private async postAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accountId: string = await this.aggregate.createAccount(req.body, req.securityContext!); // TODO: !.
			this.sendSuccessResponse(
				res,
				200,
				{accountId: accountId}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidAccountStateError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account state"
				);
			} else if (e instanceof InvalidAccountTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account type"
				);
			} else if (e instanceof InvalidCreditBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid credit balance"
				);
			} else if (e instanceof InvalidDebitBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid debit balance"
				);
			} else if (e instanceof InvalidBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid balance"
				);
			} else if (e instanceof AccountAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					400,
					"account already exists"
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async postJournalEntries(req: express.Request, res: express.Response): Promise<void> {
		try {
			const idsJournalEntries: string[] = await this.aggregate.createJournalEntries(req.body);
			this.sendSuccessResponse(
				res,
				200,
				{idsJournalEntries: idsJournalEntries}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidJournalEntryAmountError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry amount"
				);
			} else if (e instanceof JournalEntryAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					400,
					"journal entry already exists"
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async accounts(req: express.Request, res: express.Response): Promise<void> {
		// req.query is always defined - if no query was specified, req.query is an empty object.
		if (req.query.id !== undefined) {
			await this.getAccountById(req, res);
			return;
		}
		if (req.query.externalId !== undefined) {
			await this.getAccountsByExternalId(req, res);
			return;
		}
		this.sendErrorResponse( // TODO: should this be done?
			res,
			400,
			"invalid query"
		);
	}

	private async journalEntries(req: express.Request, res: express.Response): Promise<void> {
		// req.query is always defined - if no query was specified, req.query is an empty object.
		if (req.query.accountId !== undefined) {
			await this.getJournalEntriesByAccountId(req, res);
			return;
		}
		this.sendErrorResponse( // TODO: should this be done?
			res,
			400,
			"invalid query"
		);
	}

	private async getAccountById(req: express.Request, res: express.Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const account: IAccount | null = await this.aggregate.getAccountById(req.query.id as string); // TODO: cast?
			if (account === null) {
				this.sendErrorResponse(
					res,
					404,
					"no such account"
				);
				return;
			}
			this.sendSuccessResponse(
				res,
				200,
				{account: account}
			);
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getAccountsByExternalId(req: express.Request, res: express.Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const accounts: IAccount[] = await this.aggregate.getAccountsByExternalId(req.query.externalId as string); // TODO: cast?
			if (accounts === []) {
				this.sendErrorResponse(
					res,
					404,
					"no accounts with the specified external id"
				);
				return;
			}
			this.sendSuccessResponse(
				res,
				200,
				{accounts: accounts}
			);
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getJournalEntriesByAccountId(req: express.Request, res: express.Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const journalEntries: IJournalEntry[] = await this.aggregate.getJournalEntriesByAccountId(req.query.accountId as string); // TODO: cast?
			if (journalEntries === []) {
				this.sendErrorResponse(
					res,
					404,
					"no journal entries with the specified account id"
				);
				return;
			}
			this.sendSuccessResponse(
				res,
				200,
				{journalEntries: journalEntries}
			);
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private sendErrorResponse(res: express.Response, statusCode: number, message: string) {
		const response = {
			result: "ERROR",
			data: {message: message}
		}
		res.status(statusCode).json(response);
	}

	private sendSuccessResponse(res: express.Response, statusCode: number, data: any) {
		const response = {
			result: "SUCCESS",
			data: data,
		}
		res.status(statusCode).json(response);
	}

}
