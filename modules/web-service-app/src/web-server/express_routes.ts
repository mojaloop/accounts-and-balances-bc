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
	InvalidCreditBalanceError,
	InvalidDebitBalanceError,
	InvalidJournalEntryAmountError,
	JournalEntryAlreadyExistsError,
	IAccount,
	IJournalEntry,
	CreditedAndDebitedAccountsAreTheSameError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	CurrenciesDifferError, InsufficientBalanceError, UnauthorizedError
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
	private readonly UNKNOWN_ERROR_MESSAGE: string = "unknown error";

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
		this._router.use(this.authenticate.bind(this)); // All requests require authentication.
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

	// TODO: name; express.NextFunction; clarify; why returns? logs vs error responses. all status codes 403?
	private async authenticate(
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	): Promise<void> {
		const authorizationHeader: string | undefined = req.headers["authorization"]; // TODO: type.
		if (authorizationHeader === undefined) {
			this.sendErrorResponse(
				res,
				403,
				"unauthorized" // TODO: verify.
			);
			return;
		}

		const bearer: string[] = authorizationHeader.trim().split(" "); // TODO: name.
		if (bearer.length != BEARER_LENGTH) {
			this.sendErrorResponse(
				res,
				403,
				"unauthorized" // TODO: verify.
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
				"unauthorized" // TODO: verify.
			);
			return;
		}
		if (!verified) {
			this.sendErrorResponse(
				res,
				403,
				"unauthorized" // TODO: verify.
			);
			return;
		}

		const decodedToken: any = this.tokenHelper.decodeToken(bearerToken); // TODO: type.
		if (decodedToken === undefined // TODO: undefined?
			|| decodedToken === null // TODO: null?
			|| decodedToken.sub.indexOf("::") === -1) {
			this.sendErrorResponse(
				res,
				403,
				"unauthorized" // TODO: verify.
			);
			return;
		}

		const subSplit = decodedToken.sub.split("::"); // TODO: type.
		const subjectType = subSplit[0]; // TODO: type.
		const subject = subSplit[1]; // TODO: type.

		req.securityContext = {
			username: subjectType.toUpperCase().startsWith("USER") ? subject : null, // TODO: null?
			clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null, // TODO: null?
			rolesIds: decodedToken.roles,
			accessToken: bearerToken
		};

		/*req.securityContext = {
			username: "",
			clientId: "",
			rolesIds: [""],
			accessToken: ""
		}*/

		next();
	}

	private async postAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accountId: string = await this.aggregate.createAccount(req.body, req.securityContext!); // TODO: !.
			this.sendSuccessResponse(
				res,
				201,
				{accountId: accountId}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidCreditBalanceError) {
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
			} else if (e instanceof AccountAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					409,
					"account already exists"
				);
			} else if (e instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async postJournalEntries(req: express.Request, res: express.Response): Promise<void> {
		try {
			const idsJournalEntries: string[] =
				await this.aggregate.createJournalEntries(req.body, req.securityContext!); // TODO: !.
			this.sendSuccessResponse(
				res,
				201,
				{idsJournalEntries: idsJournalEntries}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidJournalEntryAmountError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry amount"
				);
			} else if (e instanceof CreditedAndDebitedAccountsAreTheSameError) {
				this.sendErrorResponse(
					res,
					400,
					"credited and debited accounts are the same"
				);
			} else if (e instanceof NoSuchCreditedAccountError) {
				this.sendErrorResponse(
					res,
					400,
					"no such credited account"
				);
			} else if (e instanceof NoSuchDebitedAccountError) {
				this.sendErrorResponse(
					res,
					400,
					"no such debited account"
				);
			} else if (e instanceof CurrenciesDifferError) {
				this.sendErrorResponse(
					res,
					400,
					"currencies differ"
				);
			} else if (e instanceof InsufficientBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"insufficient balance"
				);
			} else if (e instanceof JournalEntryAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					409,
					"journal entry already exists"
				);
			} else if (e instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR_MESSAGE
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
			400, // TODO: status code.
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
			400, // TODO: status code.
			"invalid query"
		);
	}

	private async getAccountById(req: express.Request, res: express.Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const account: IAccount | null =
				await this.aggregate.getAccountById(req.query.id as string, req.securityContext!); // TODO: cast? !.
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
			if (e instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getAccountsByExternalId(req: express.Request, res: express.Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const accounts: IAccount[] =
				await this.aggregate.getAccountsByExternalId(req.query.externalId as string, req.securityContext!); // TODO: cast? !.
			if (accounts.length === 0) {
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
			if (e instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getJournalEntriesByAccountId(req: express.Request, res: express.Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const journalEntries: IJournalEntry[] =
				await this.aggregate.getJournalEntriesByAccountId(req.query.accountId as string, req.securityContext!); // TODO: cast? !.
			if (journalEntries.length === 0) {
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
			if (e instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private sendErrorResponse(res: express.Response, statusCode: number, message: string) {
		res.status(statusCode).json({message: message});
	}

	private sendSuccessResponse(res: express.Response, statusCode: number, data: any) {
		res.status(statusCode).json(data);
	}

}
