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
import {NextFunction, Request, Response, Router} from "express";
import {
	Aggregate,
	AccountAlreadyExistsError,
	InvalidCreditBalanceError,
	InvalidDebitBalanceError,
	InvalidJournalEntryAmountError,
	JournalEntryAlreadyExistsError,
	SameCreditedAndDebitedAccountsError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	InsufficientBalanceError,
	UnauthorizedError,
	InvalidExternalIdError,
	InvalidExternalCategoryError,
	CurrencyCodesDifferError,
	InvalidCurrencyCodeError,
	InvalidTimestampError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {TokenHelper, CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

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
	private static readonly UNKNOWN_ERROR_MESSAGE: string = "unknown error";
	private readonly _router: Router;

	constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
		aggregate: Aggregate
	) {
		this.logger = logger;
		this.tokenHelper = tokenHelper;
		this.aggregate = aggregate;

		this._router = Router();
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

	get router(): Router {
		return this._router;
	}

	// TODO: name; NextFunction; clarify; why returns? logs vs error responses. all status codes 403?
	private async authenticate(
		req: Request,
		res: Response,
		next: NextFunction
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
		} catch (error: unknown) {
			this.logger.error(error);
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

	private async postAccount(req: Request, res: Response): Promise<void> {
		try {
			const accountId: string = await this.aggregate.createAccount(req.body, req.securityContext!); // TODO: !.
			this.sendSuccessResponse(
				res,
				201,
				{accountId: accountId}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else if (error instanceof InvalidExternalIdError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid external id"
				);
			} else if (error instanceof InvalidCreditBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid credit balance"
				);
			} else if (error instanceof InvalidDebitBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid debit balance"
				);
			} else if (error instanceof InvalidTimestampError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid timestamp"
				);
			} else if (error instanceof InvalidCurrencyCodeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid currency code"
				);
			} else if (error instanceof AccountAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					409,
					"account already exists"
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					ExpressRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async postJournalEntries(req: Request, res: Response): Promise<void> {
		try {
			const idsJournalEntries: string[] =
				await this.aggregate.createJournalEntries(req.body, req.securityContext!); // TODO: !.
			this.sendSuccessResponse(
				res,
				201,
				{idsJournalEntries: idsJournalEntries}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else if (error instanceof InvalidExternalIdError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid external id"
				);
			} else if (error instanceof InvalidExternalCategoryError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid external category"
				);
			} else if (error instanceof InvalidJournalEntryAmountError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry amount"
				);
			} else if (error instanceof SameCreditedAndDebitedAccountsError) {
				this.sendErrorResponse(
					res,
					400,
					"credited and debited accounts are the same"
				);
			} else if (error instanceof NoSuchCreditedAccountError) {
				this.sendErrorResponse(
					res,
					400,
					"no such credited account"
				);
			} else if (error instanceof NoSuchDebitedAccountError) {
				this.sendErrorResponse(
					res,
					400,
					"no such debited account"
				);
			} else if (error instanceof CurrencyCodesDifferError) {
				this.sendErrorResponse(
					res,
					400,
					"currency codes differ"
				);
			} else if (error instanceof InvalidCurrencyCodeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid currency code"
				);
			} else if (error instanceof InsufficientBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"insufficient balance"
				);
			} else if (error instanceof JournalEntryAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					409,
					"journal entry already exists"
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					ExpressRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async accounts(req: Request, res: Response): Promise<void> {
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

	private async journalEntries(req: Request, res: Response): Promise<void> {
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

	private async getAccountById(req: Request, res: Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const accountDto: IAccountDto | null =
				await this.aggregate.getAccountById(req.query.id as string, req.securityContext!); // TODO: cast? !.
			if (accountDto === null) {
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
				{account: accountDto}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					ExpressRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getAccountsByExternalId(req: Request, res: Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			const accountDtos: IAccountDto[] =
				await this.aggregate.getAccountsByExternalId(req.query.externalId as string, req.securityContext!); // TODO: cast? !.
			if (accountDtos.length === 0) {
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
				{accounts: accountDtos}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					ExpressRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getJournalEntriesByAccountId(req: Request, res: Response): Promise<void> {
		try {
			// The properties of the req.query object are always strings. TODO: check.
			// The properties of the req.query object are always strings. TODO: check.
			const journalEntryDtos: IJournalEntryDto[] =
				await this.aggregate.getJournalEntriesByAccountId(req.query.accountId as string, req.securityContext!); // TODO: cast? !.
			if (journalEntryDtos.length === 0) {
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
				{journalEntries: journalEntryDtos}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					res,
					403,
					"unauthorized" // TODO: verify.
				);
			} else {
				this.sendErrorResponse(
					res,
					500,
					ExpressRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private sendErrorResponse(res: Response, statusCode: number, message: string) {
		res.status(statusCode).json({message: message});
	}

	private sendSuccessResponse(res: Response, statusCode: number, data: any) {
		res.status(statusCode).json(data);
	}

}
