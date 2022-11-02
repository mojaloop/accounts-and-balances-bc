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
	SameDebitedAndCreditedAccountsError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	InsufficientBalanceError,
	UnauthorizedError,
	InvalidExternalIdError,
	InvalidExternalCategoryError,
	CurrencyCodesDifferError,
	InvalidCurrencyCodeError,
	InvalidTimestampError,
	InvalidIdError,
	InvalidCurrencyDecimalsError,
	InvalidAccountStateError,
	InvalidAccountTypeError
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

export class ExpressRestRoutes {
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
		this.logger = logger.createChild(this.constructor.name);
		this.tokenHelper = tokenHelper;
		this.aggregate = aggregate;

		this._router = Router();
		this.setUp();
	}

	private setUp(): void {
		// Inject authentication - all requests require a valid access token. TODO: clarify.
		this._router.use(this.authenticate.bind(this)); // All requests require authentication.
		// Posts.
		this._router.post("/accounts", this.postAccount.bind(this));
		this._router.post("/journalEntries", this.postJournalEntries.bind(this));
		// Gets.
		this._router.get("/accounts", this.getsAccounts.bind(this)); // TODO: function name.
		this._router.get("/journalEntries", this.getsJournalEntries.bind(this)); // TODO: function name.
	}

	get router(): Router {
		return this._router;
	}

	// TODO: function name; NextFunction; logs vs error responses; verify status codes and messages; clarify.
	private async authenticate(request: Request, response: Response, next: NextFunction): Promise<void> {
		const authorizationHeader: string | undefined = request.headers.authorization;
		if (authorizationHeader === undefined) {
			this.sendErrorResponse(
				response,
				403,
				"unauthorized"
			);
			return;
		}

		const bearer: string[] = authorizationHeader.trim().split(" "); // TODO: verify name.
		if (bearer.length !== BEARER_LENGTH) {
			this.sendErrorResponse(
				response,
				403,
				"unauthorized"
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
				response,
				403,
				"unauthorized"
			);
			return;
		}
		if (!verified) {
			this.sendErrorResponse(
				response,
				403,
				"unauthorized"
			);
			return;
		}

		const decodedToken: any = this.tokenHelper.decodeToken(bearerToken); // TODO: verify type.
		if (decodedToken === undefined // TODO: undefined?
			|| decodedToken === null // TODO: null?
			|| decodedToken.sub.indexOf("::") === -1) {
			this.sendErrorResponse(
				response,
				403,
				"unauthorized"
			);
			return;
		}

		const subSplit = decodedToken.sub.split("::"); // TODO: verify type.
		const subjectType = subSplit[0]; // TODO: verify type.
		const subject = subSplit[1]; // TODO: verify type.

		request.securityContext = {
			username: subjectType.toUpperCase().startsWith("USER") ? subject : null, // TODO: null?
			clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null, // TODO: null?
			rolesIds: decodedToken.roles,
			accessToken: bearerToken
		};

		/*request.securityContext = {
			username: "",
			clientId: "",
			rolesIds: [""],
			accessToken: ""
		}*/

		next();
	}

	private async postAccount(request: Request, response: Response): Promise<void> {
		try {
			const accountId: string = await this.aggregate.createAccount(request.body, request.securityContext!); // TODO: take care of non-null assertion.
			this.sendSuccessResponse(
				response,
				201,
				{accountId: accountId}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					response,
					403,
					error.message
				);
			} else if (error instanceof InvalidCurrencyDecimalsError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidTimestampError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidDebitBalanceError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidCreditBalanceError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidIdError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidExternalIdError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidAccountStateError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidAccountTypeError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidCurrencyCodeError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof AccountAlreadyExistsError) {
				this.sendErrorResponse(
					response,
					409,
					error.message
				);
			} else {
				this.sendErrorResponse(
					response,
					500,
					ExpressRestRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async postJournalEntries(request: Request, response: Response): Promise<void> {
		try {
			const idsJournalEntries: string[] =
				await this.aggregate.createJournalEntries(request.body, request.securityContext!); // TODO: take care of non-null assertion.
			this.sendSuccessResponse(
				response,
				201,
				{idsJournalEntries: idsJournalEntries}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					response,
					403,
					error.message
				);
			} else if (error instanceof InvalidCurrencyDecimalsError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidTimestampError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidIdError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidExternalIdError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidExternalCategoryError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidCurrencyCodeError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InvalidJournalEntryAmountError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof SameDebitedAndCreditedAccountsError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof NoSuchDebitedAccountError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof NoSuchCreditedAccountError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof CurrencyCodesDifferError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof InsufficientBalanceError) {
				this.sendErrorResponse(
					response,
					400,
					error.message
				);
			} else if (error instanceof JournalEntryAlreadyExistsError) {
				this.sendErrorResponse(
					response,
					409,
					error.message
				);
			} else {
				this.sendErrorResponse(
					response,
					500,
					ExpressRestRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getsAccounts(request: Request, response: Response): Promise<void> {
		// request.query is always defined - if no query was specified, request.query is an empty object.
		if (request.query.id !== undefined) {
			await this.getAccountById(request, response);
			return;
		}
		if (request.query.externalId !== undefined) {
			await this.getAccountsByExternalId(request, response);
			return;
		}
		this.sendErrorResponse( // TODO: should this be done?
			response,
			400, // TODO: verify status code.
			"invalid query" // TODO: verify message.
		);
	}

	private async getsJournalEntries(request: Request, response: Response): Promise<void> {
		// request.query is always defined - if no query was specified, request.query is an empty object.
		if (request.query.accountId !== undefined) {
			await this.getJournalEntriesByAccountId(request, response);
			return;
		}
		this.sendErrorResponse( // TODO: should this be done?
			response,
			400, // TODO: verify status code.
			"invalid query" // TODO: verify message.
		);
	}

	private async getAccountById(request: Request, response: Response): Promise<void> {
		try {
			// The properties of the request.query object are always strings. TODO: verify.
			const accountDto: IAccountDto | null =
				await this.aggregate.getAccountById(request.query.id as string, request.securityContext!); // TODO: take care of non-null assertion.
			if (accountDto === null) {
				this.sendErrorResponse(
					response,
					404,
					"no such account"
				);
				return;
			}
			this.sendSuccessResponse(
				response,
				200,
				{account: accountDto}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					response,
					403,
					error.message
				);
			} else {
				this.sendErrorResponse(
					response,
					500,
					ExpressRestRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getAccountsByExternalId(request: Request, response: Response): Promise<void> {
		try {
			// The properties of the request.query object are always strings. TODO: verify.
			const accountDtos: IAccountDto[] =
				await this.aggregate.getAccountsByExternalId(request.query.externalId as string, request.securityContext!); // TODO: take care of non-null assertion.
			if (accountDtos.length === 0) {
				this.sendErrorResponse(
					response,
					404,
					"no accounts with the specified external id"
				);
				return;
			}
			this.sendSuccessResponse(
				response,
				200,
				{accounts: accountDtos}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					response,
					403,
					error.message
				);
			} else {
				this.sendErrorResponse(
					response,
					500,
					ExpressRestRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private async getJournalEntriesByAccountId(request: Request, response: Response): Promise<void> {
		try {
			// The properties of the request.query object are always strings. TODO: verify.
			const journalEntryDtos: IJournalEntryDto[] =
				await this.aggregate.getJournalEntriesByAccountId(request.query.accountId as string, request.securityContext!); // TODO: take care of non-null assertion.
			if (journalEntryDtos.length === 0) {
				this.sendErrorResponse(
					response,
					404,
					"no journal entries with the specified account id"
				);
				return;
			}
			this.sendSuccessResponse(
				response,
				200,
				{journalEntries: journalEntryDtos}
			);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				this.sendErrorResponse(
					response,
					403,
					error.message
				);
			} else {
				this.sendErrorResponse(
					response,
					500,
					ExpressRestRoutes.UNKNOWN_ERROR_MESSAGE
				);
			}
		}
	}

	private sendErrorResponse(response: Response, statusCode: number, message: string) {
		response.status(statusCode).json({message: message});
	}

	private sendSuccessResponse(response: Response, statusCode: number, data: any) {
		response.status(statusCode).json(data);
	}

}
