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
import {IAccount} from "@mojaloop/accounts-and-balances-private-types";
import {IJournalEntry} from "@mojaloop/accounts-and-balances-private-types/dist";

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
			res.status(200).json({
				status: "success",
				accountId: accountId
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async postJournalEntry(req: express.Request, res: express.Response): Promise<void> {
		try {
			const journalEntryId: string = await this.aggregate.createJournalEntry(req.body);
			res.status(200).json({
				status: "success",
				journalEntryId: journalEntryId
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getAccount(req: express.Request, res: express.Response): Promise<void> {
		try {
			const account: IAccount | null = await this.aggregate.getAccount(req.params.accountId);
			res.status(200).json({
				status: "success",
				account: account
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getJournalEntry(req: express.Request, res: express.Response): Promise<void> {
		try {
			const journalEntry: IJournalEntry | null = await this.aggregate.getJournalEntry(req.params.journalEntryId);
			res.status(200).json({
				status: "success",
				journalEntry: journalEntry
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async getAccounts(req: express.Request, res: express.Response): Promise<void> {
		try {
			const accounts: IAccount[] = await this.aggregate.getAccounts();
			res.status(200).json({
				status: "success",
				accounts: accounts
			});
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
			res.status(200).json({
				status: "success",
				journalEntries: journalEntries
			});
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
			res.status(200).json({
				status: "success",
				message: "account deleted"
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async deleteJournalEntry(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.deleteJournalEntry(req.params.journalEntryId);
			res.status(200).json({
				status: "success",
				message: "journal entry deleted"
			});
		} catch (e: unknown) {
			this.sendErrorResponse(
				res,
				500,
				this.UNKNOWN_ERROR
			);
		}
	}

	private async deleteAccounts(req: express.Request, res: express.Response): Promise<void> {
		try {
			await this.aggregate.deleteAccounts();
			res.status(200).json({
				status: "success",
				message: "accounts deleted"
			});
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
			res.status(200).json({
				status: "success",
				message: "journal entries deleted"
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
