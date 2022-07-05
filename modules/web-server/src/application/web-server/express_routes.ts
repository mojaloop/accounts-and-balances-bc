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
import {
	IAccount,
	IJournalEntry,
	IResponse,
	ResponseResult
} from "@mojaloop/accounts-and-balances-bc-private-types";
import {
	AccountAlreadyExistsError,
	InvalidAccountIdTypeError,
	InvalidAccountStateError,
	InvalidAccountStateTypeError,
	InvalidAccountTypeError,
	InvalidAccountTypeTypeError, InvalidBalanceError,
	InvalidBalanceTypeError,
	InvalidCreditBalanceError,
	InvalidCreditBalanceTypeError,
	InvalidCreditedAccountIdTypeError,
	InvalidCurrencyTypeError,
	InvalidDebitBalanceError,
	InvalidDebitBalanceTypeError,
	InvalidDebitedAccountIdTypeError,
	InvalidExtCategoryTypeError,
	InvalidExtIdTypeError, InvalidJournalEntryAmountError,
	InvalidJournalEntryAmountTypeError,
	InvalidJournalEntryIdTypeError, InvalidTimeStampTypeError,
	JournalEntryAlreadyExistsError,
	NoSuchAccountError,
	NoSuchJournalEntryError
} from "../../domain/errors";

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
		this._router.post("/accounts", this.postAccount.bind(this));
		this._router.post("/journalEntries", this.postJournalEntry.bind(this));
		// Gets.
		this._router.get("/accounts/:accountId", this.getAccount.bind(this));
		this._router.get("/journalEntries/:journalEntryId", this.getJournalEntry.bind(this));
		this._router.get("/accounts", this.getAccounts.bind(this));
		this._router.get("/journalEntries", this.getJournalEntries.bind(this));
		// Deletes.
		this._router.delete("/accounts/:accountId", this.deleteAccount.bind(this));
		this._router.delete("/journalEntries/:journalEntryId", this.deleteJournalEntry.bind(this));
		this._router.delete("/accounts", this.deleteAccounts.bind(this));
		this._router.delete("/journalEntries", this.deleteJournalEntries.bind(this));
	}

	get router(): express.Router {
		return this._router;
	}

	private async postAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accountId: string = await this.aggregate.createAccount(req.body);
			this.sendSuccessResponse(
				res,
				200,
				{accountId: accountId}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidAccountIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account id type");
			} else if (e instanceof InvalidExtIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid ext id type");
			} else if (e instanceof InvalidAccountStateTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account state type");
			} else if (e instanceof InvalidAccountStateError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account state");
			} else if (e instanceof InvalidAccountTypeTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account type type (the type of the account type)");
			} else if (e instanceof InvalidAccountTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account type");
			} else if (e instanceof InvalidCurrencyTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid currency type");
			} else if (e instanceof InvalidCreditBalanceTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid credit balance type");
			} else if (e instanceof InvalidCreditBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid credit balance");
			} else if (e instanceof InvalidDebitBalanceTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid debit balance type");
			} else if (e instanceof InvalidDebitBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid debit balance");
			} else if (e instanceof InvalidBalanceTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid balance type");
			} else if (e instanceof InvalidBalanceError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid balance");
			} else if (e instanceof InvalidTimeStampTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid time stamp type");
			} else if (e instanceof AccountAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					400,
					"account already exists");
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async postJournalEntry(req: express.Request, res: express.Response): Promise<void> {
		try {
			const journalEntryId: string = await this.aggregate.createJournalEntry(req.body);
			this.sendSuccessResponse(
				res,
				200,
				{journalEntryId: journalEntryId}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidJournalEntryIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry id type");
			} else if (e instanceof InvalidExtIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid ext id type");
			} else if (e instanceof InvalidExtCategoryTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid ext category type");
			} else if (e instanceof InvalidCurrencyTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid currency type");
			} else if (e instanceof InvalidJournalEntryAmountTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry amount type");
			} else if (e instanceof InvalidJournalEntryAmountError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry amount");
			} else if (e instanceof InvalidCreditedAccountIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid credited account id type");
			} else if (e instanceof InvalidDebitedAccountIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid debited account id type");
			} else if (e instanceof InvalidTimeStampTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid time stamp type");
			} else if (e instanceof JournalEntryAlreadyExistsError) {
				this.sendErrorResponse(
					res,
					400,
					"journal entry already exists");
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async getAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			const account: IAccount | null = await this.aggregate.getAccount(req.params.accountId);
			if (account === null) {
				this.sendErrorResponse(
					res,
					404,
					"no such account");
				return;
			}
			this.sendSuccessResponse(
				res,
				200,
				{account: account}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidAccountIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account id type");
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async getJournalEntry(req: express.Request, res: express.Response): Promise<void> {
		try {
			const journalEntry: IJournalEntry | null = await this.aggregate.getJournalEntry(req.params.journalEntryId);
			if (journalEntry === null) {
				this.sendErrorResponse(
					res,
					404,
					"no such journal entry");
				return;
			}
			this.sendSuccessResponse(
				res,
				200,
				{journalEntry: journalEntry}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidJournalEntryIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry id type");
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async getAccounts(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accounts: IAccount[] = await this.aggregate.getAccounts();
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

	private async getJournalEntries(req: express.Request, res: express.Response): Promise<void> {
		try {
			const journalEntries: IJournalEntry[] = await this.aggregate.getJournalEntries();
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

	private async deleteAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.deleteAccount(req.params.accountId);
			this.sendSuccessResponse(
				res,
				200,
				{message: "account deleted"}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidAccountIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid account id type");
			} else if (e instanceof NoSuchAccountError) {
				this.sendErrorResponse(
					res,
					404,
					"no such account");
				return;
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async deleteJournalEntry(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.deleteJournalEntry(req.params.journalEntryId);
			this.sendSuccessResponse(
				res,
				200,
				{message: "journal entry deleted"}
			);
		} catch (e: unknown) {
			if (e instanceof InvalidJournalEntryIdTypeError) {
				this.sendErrorResponse(
					res,
					400,
					"invalid journal entry id type");
			} else if (e instanceof NoSuchJournalEntryError) {
				this.sendErrorResponse(
					res,
					404,
					"no such journal entry");
				return;
			} else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR
				);
			}
		}
	}

	private async deleteAccounts(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.deleteAccounts();
			this.sendSuccessResponse(
				res,
				200,
				{message: "accounts deleted"}
			);
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async deleteJournalEntries(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.deleteJournalEntries();
			this.sendSuccessResponse(
				res,
				200,
				{message: "journal entries deleted"}
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
		const response: IResponse = {
			result: ResponseResult.ERROR,
			data: {message: message}
		}
		res.status(statusCode).json(response);
	}

	private sendSuccessResponse(res: express.Response, statusCode: number, data: any) {
		const response: IResponse = {
			result: ResponseResult.SUCCESS,
			data: data
		}
		res.status(statusCode).json(response);
	}

}
