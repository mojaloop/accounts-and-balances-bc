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

import {ServerErrorResponse} from "@grpc/grpc-js/build/src/index";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ServerUnaryCall, sendUnaryData, status} from "@grpc/grpc-js";
import {
	Empty,
	GrpcAccount,
	GrpcAccount__Output,
	GrpcAccountArray,
	GrpcAccountArray__Output,
	GrpcAccountsAndBalancesHandlers,
	GrpcId,
	GrpcId__Output,
	GrpcIdArray,
	GrpcIdArray__Output,
	GrpcJournalEntry,
	GrpcJournalEntry__Output,
	GrpcJournalEntryArray,
	GrpcJournalEntryArray__Output
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {TokenHelper, CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {AccountNotFoundError, AccountsAndBalancesAccount, AccountsAndBalancesAccountState, AccountsAndBalancesAccountType,
	AcountsAndBalancesJournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ForbiddenError} from "@mojaloop/security-bc-public-types-lib/dist/index";
import {AccountsAndBalancesAggregate} from "../../domain/aggregate";

const UNKNOWN_ERROR_MESSAGE ="unknown error"; 

export class GrpcHandlers {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _aggregate: AccountsAndBalancesAggregate;
	private readonly _tokenHelper: TokenHelper;
	
	constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
		aggregate: AccountsAndBalancesAggregate
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._tokenHelper = tokenHelper;
		this._aggregate = aggregate;
	}

	getHandlers(): GrpcAccountsAndBalancesHandlers {
		return {
			"CreateAccounts": this._createAccounts.bind(this),
			"CreateJournalEntries": this._createJournalEntries.bind(this),
			"GetAccountsByIds": this._getAccountsByIds.bind(this),
			"GetAccountsByOwnerId": this._getAccountsByOwnerId.bind(this),
			"GetJournalEntriesByAccountId": this._getJournalEntriesByAccountId.bind(this),
			"DeleteAccountsByIds": this._deleteAccountsByIds.bind(this),
			"DeactivateAccountsByIds": this._deactivateAccountsByIds.bind(this),
			"ActivateAccountsByIds": this._activateAccountsByIds.bind(this)
		};
	}

	/**
	 * This will return the secCtx if successful,
	 * if not will call the callback with the correct err and return null
	 * @param call ServerUnaryCall
	 * @param callback sendUnaryData
	 * @private
	 */
	private async _getSecCtxFromCall(call: ServerUnaryCall<any, any>, callback: sendUnaryData<any>): Promise<CallSecurityContext | null> {
		const returnUnauthorized = () => {
			callback(this._handleAggregateError(new UnauthorizedError()));
			return null;
		};

		const callTokenMeta = call.metadata.get("TOKEN");
		if (!callTokenMeta) return returnUnauthorized();

		const bearerToken = callTokenMeta[0] as string;
		if (!bearerToken) return returnUnauthorized();

		let verified;
		try {
			verified = await this._tokenHelper.verifyToken(bearerToken);
		} catch (err) {
			this._logger.error(err, "unable to verify token");
			return returnUnauthorized();
		}
		if (!verified) return returnUnauthorized();

		const decoded = this._tokenHelper.decodeToken(bearerToken);
		if (!decoded.sub || decoded.sub.indexOf("::")== -1) {
			return returnUnauthorized();
		}

		const subSplit = decoded.sub.split("::");
		const subjectType = subSplit[0];
		const subject = subSplit[1];

		return {
			accessToken: bearerToken,
			clientId: subjectType.toUpperCase().startsWith("APP") ? subject:null,
			username: subjectType.toUpperCase().startsWith("USER") ? subject:null,
			rolesIds: decoded.roles
		};
	}


	private async _createAccounts(
		call: ServerUnaryCall<GrpcAccountArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountsOutput: GrpcAccount__Output[] = call.request.grpcAccountArray || [];

		const accounts: AccountsAndBalancesAccount[] = grpcAccountsOutput.map((grpcAccountOutput) => {
			if (
				grpcAccountOutput.ownerId === undefined // TODO: "" might be passed - what should I do here?
				|| !grpcAccountOutput.state
				|| !grpcAccountOutput.type
				|| !grpcAccountOutput.currencyCode
			) {
				throw new Error(); // TODO: create custom error.
			}

			const account: AccountsAndBalancesAccount = {
				id: grpcAccountOutput.id ?? null, 
				ownerId: grpcAccountOutput.ownerId,
				state: grpcAccountOutput.state as AccountsAndBalancesAccountState, // TODO: cast?
				type: grpcAccountOutput.type as AccountsAndBalancesAccountType, // TODO: cast?
				currencyCode: grpcAccountOutput.currencyCode,
				postedDebitBalance: grpcAccountOutput.postedDebitBalance ?? null,
				pendingDebitBalance: grpcAccountOutput.pendingDebitBalance ?? null,
				postedCreditBalance: grpcAccountOutput.postedCreditBalance ?? null,
				pendingCreditBalance: grpcAccountOutput.pendingCreditBalance ?? null,
				balance: grpcAccountOutput.balance ?? null, 
				timestampLastJournalEntry: grpcAccountOutput.timestampLastJournalEntry ?? null 
			};
			return account;
		});

		let accountIds: string[];
		try {
			accountIds = await this._aggregate.createAccounts(secCtx, accounts);
		} catch (error: any) {
			return callback(this._handleAggregateError(error));
		}

		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});
		callback(null, {grpcIdArray: grpcAccountIds});
	}

	private async _createJournalEntries(
		call: ServerUnaryCall<GrpcJournalEntryArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] = call.request.grpcJournalEntryArray || [];

		const journalEntries: AcountsAndBalancesJournalEntry[] = grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
			if (
				!grpcJournalEntryOutput.currencyCode
				|| !grpcJournalEntryOutput.amount
				|| !grpcJournalEntryOutput.debitedAccountId
				|| !grpcJournalEntryOutput.creditedAccountId
			) {
				throw new Error();
			}

			const journalEntry: AcountsAndBalancesJournalEntry = {
				id: grpcJournalEntryOutput.id ?? null, 
				ownerId: grpcJournalEntryOutput.ownerId ?? null, 
				currencyCode: grpcJournalEntryOutput.currencyCode,
				amount: grpcJournalEntryOutput.amount,
				pending: grpcJournalEntryOutput.pending!,
				debitedAccountId: grpcJournalEntryOutput.debitedAccountId,
				creditedAccountId: grpcJournalEntryOutput.creditedAccountId,
				timestamp: grpcJournalEntryOutput.timestamp ?? null 
			};
			return journalEntry;
		});

		let journalEntryIds: string[];
		try {
			journalEntryIds = await this._aggregate.createJournalEntries(secCtx, journalEntries);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcJournalEntryIds: GrpcId[] = journalEntryIds.map((journalEntryId) => {
			return {grpcId: journalEntryId};
		});
		callback(null, {grpcIdArray: grpcJournalEntryIds});
	}

	private async _getAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		let accounts: AccountsAndBalancesAccount[];
		try {
			accounts = await this._aggregate.getAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			return this._accountToGrpcAccount(account);
		});
		callback(null, {grpcAccountArray: grpcAccounts});
	}

	private async _getAccountsByOwnerId(
		call: ServerUnaryCall<GrpcId__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const ownerId: string | undefined = call.request.grpcId;
		if (!ownerId) {
			callback(
				{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let accounts: AccountsAndBalancesAccount[];
		try {
			accounts = await this._aggregate.getAccountsByOwnerId(secCtx, ownerId);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			return this._accountToGrpcAccount(account);
		});
		callback(null, {grpcAccountArray: grpcAccounts});
	}

	private async _getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId__Output, GrpcJournalEntryArray>,
		callback: sendUnaryData<GrpcJournalEntryArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const accountId: string | undefined = call.request.grpcId;
		if (!accountId) {
			callback(
				{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let journalEntries: AcountsAndBalancesJournalEntry[];
		try {
			journalEntries = await this._aggregate.getJournalEntriesByAccountId(secCtx, accountId);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcJournalEntries: GrpcJournalEntry[] = journalEntries.map((journalEntry) => {
			const grpcJournalEntry: GrpcJournalEntry = {
				id: journalEntry.id ?? undefined, 
				ownerId: journalEntry.ownerId ?? undefined, 
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp ?? undefined 
			};
			return grpcJournalEntry;
		});
		callback(null, {grpcJournalEntryArray: grpcJournalEntries});
	}

	private async _deleteAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {

			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this._aggregate.deleteAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private async _deactivateAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this._aggregate.deactivateAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private async _activateAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId;
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this._aggregate.reactivateAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private _accountToGrpcAccount(account: AccountsAndBalancesAccount): GrpcAccount {
		const grpcAccount: GrpcAccount = {
			id: account.id ?? undefined, 
			ownerId: account.ownerId,
			state: account.state as AccountsAndBalancesAccountState,
			type: account.type as AccountsAndBalancesAccountType,
			currencyCode: account.currencyCode,
			postedDebitBalance: account.postedDebitBalance ?? undefined,
			pendingDebitBalance: account.pendingDebitBalance ?? undefined,
			postedCreditBalance: account.postedCreditBalance ?? undefined,
			pendingCreditBalance: account.pendingCreditBalance ?? undefined,
			balance: account.balance ?? undefined,
			timestampLastJournalEntry: account.timestampLastJournalEntry ?? undefined 
		};
		return grpcAccount;
	}

	private _handleAggregateError(error: any): ServerErrorResponse {
		const srvError: ServerErrorResponse = {
			name: error.constructor.name,
			message: error.message || ""
		};

		if (error instanceof UnauthorizedError) {
			srvError.code = status.UNAUTHENTICATED;
		} else if (error instanceof ForbiddenError) {
			srvError.code = status.PERMISSION_DENIED;
		} else if (error instanceof AccountNotFoundError) {
			srvError.code = status.NOT_FOUND;
		} else {
			srvError.code = status.UNKNOWN;
		}
		return srvError;
	}
}
