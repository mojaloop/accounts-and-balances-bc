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
import {
	GrpcCancelReservationAndCommitRequest
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib/dist/types/proto-gen/GrpcCancelReservationAndCommitRequest";
import {
	GrpcCheckLiquidAndReserveRequest
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib/dist/types/proto-gen/GrpcCheckLiquidAndReserveRequest";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ServerUnaryCall, sendUnaryData, status} from "@grpc/grpc-js";
import {
	Empty,
	GrpcAccount,
	GrpcAccountArray,
	GrpcAccountsAndBalancesHandlers,
	GrpcCancelReservationRequest, GrpcCreateAccount,
	GrpcCreateAccountArray,
	GrpcCreateJournalEntry,
	GrpcCreateJournalEntryArray,
	GrpcId,
	GrpcIdArray,
	GrpcJournalEntry,
	GrpcJournalEntryArray,
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {TokenHelper, CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {
	AccountNotFoundError,
	AccountsAndBalancesAccount,
	AccountsAndBalancesAccountState,
	AccountsAndBalancesAccountType,
	AccountsAndBalancesError,
	AccountsAndBalancesJournalEntry,
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ForbiddenError} from "@mojaloop/security-bc-public-types-lib/dist/index";
import {randomUUID} from "crypto";
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
			"ActivateAccountsByIds": this._activateAccountsByIds.bind(this),
			"CheckLiquidAndReserve": this._checkLiquidAndReserve.bind(this),
			"CancelReservationAndCommit": this._cancelReservationAndCommit.bind(this),
			"CancelReservation": this._cancelReservation.bind(this)
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
		const returnUnauthorized = (msg: string) => {
			callback(this._handleAggregateError(new UnauthorizedError(msg)));
			return null;
		};

		const callTokenMeta = call.metadata.get("TOKEN");
		if (!callTokenMeta) return returnUnauthorized("Could not get token from call metadata");

		const bearerToken = callTokenMeta[0] as string;
		if (!bearerToken) return returnUnauthorized("Could not get token from call metadata array (metadata key exists)");

		let verified;
		try {
			verified = await this._tokenHelper.verifyToken(bearerToken);
		} catch (err) {
			this._logger.error(err, "Unable to verify token - verifyToken() failed");
			return returnUnauthorized("Unable to verify token - verifyToken() failed");
		}
		if (!verified) {
			this._logger.warn("Unable to verify token - verifyToken() return false");
			return returnUnauthorized("Unable to verify token - verifyToken() return false");
		}

		const decoded = this._tokenHelper.decodeToken(bearerToken);
		if (!decoded.sub || decoded.sub.indexOf("::")== -1) {
			this._logger.warn("Unable to decodeToken token");
			return returnUnauthorized("Unable to decodeToken token");
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

	private async _checkLiquidAndReserve(
		call: ServerUnaryCall<GrpcCheckLiquidAndReserveRequest, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void>{
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const req: GrpcCheckLiquidAndReserveRequest = call.request;

		if(!req.hubJokeAccountId || !req.payerPositionAccountId || !req.payerLiquidityAccountId){
			throw new AccountsAndBalancesError("Invalid accounts on CheckLiquidAndReserve request");
		}
		if(!req.transferAmount){
			throw new AccountsAndBalancesError("Invalid transferAmount on CheckLiquidAndReserve request");
		}
		if (!req.currencyCode) {
			throw new AccountsAndBalancesError("Invalid currencyCode on CheckLiquidAndReserve request");
		}
		if (!req.payerNetDebitCap) {
			throw new AccountsAndBalancesError("Invalid payerNetDebitCap on CheckLiquidAndReserve request");
		}
		if (!req.transferId) {
			throw new AccountsAndBalancesError("Invalid transferId on CheckLiquidAndReserve request");
		}

		try {
			await this._aggregate.checkLiquidAndReserve(
				secCtx,
				req.payerPositionAccountId, req.payerLiquidityAccountId, req.hubJokeAccountId,
				req.transferAmount, req.currencyCode, req.payerNetDebitCap, req.transferId
				);
			return callback(null, {});
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

	}

	private async _cancelReservationAndCommit(
		call: ServerUnaryCall<GrpcCancelReservationAndCommitRequest, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const req: GrpcCancelReservationAndCommitRequest = call.request;

		if (!req.hubJokeAccountId || !req.payerPositionAccountId || !req.payeePositionAccountId) {
			throw new AccountNotFoundError("Invalid accounts on CancelReservationAndCommit request");
		}
		if (!req.transferAmount) {
			throw new AccountNotFoundError("Invalid transferAmount on CancelReservationAndCommit request");
		}
		if (!req.currencyCode) {
			throw new AccountNotFoundError("Invalid currencyCode on CancelReservationAndCommit request");
		}
		if (!req.transferId) {
			throw new AccountsAndBalancesError("Invalid transferId on CheckLiquidAndReserve request");
		}

		try {
			await this._aggregate.cancelReservationAndCommit(
				secCtx, req.payerPositionAccountId, req.payeePositionAccountId, req.hubJokeAccountId,
				req.transferAmount, req.currencyCode, req.transferId
			);
			return callback(null, {});
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

	}

	private async _cancelReservation(
		call: ServerUnaryCall<GrpcCancelReservationRequest, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const req: GrpcCancelReservationAndCommitRequest = call.request;

		if (!req.hubJokeAccountId || !req.payerPositionAccountId || !req.payeePositionAccountId) {
			throw new AccountNotFoundError("Invalid accounts on CancelReservationAndCommit request");
		}
		if (!req.transferAmount) {
			throw new AccountNotFoundError("Invalid transferAmount on CancelReservationAndCommit request");
		}
		if (!req.currencyCode) {
			throw new AccountNotFoundError("Invalid currencyCode on CancelReservationAndCommit request");
		}
		if (!req.transferId) {
			throw new AccountsAndBalancesError("Invalid transferId on CheckLiquidAndReserve request");
		}

		try {
			await this._aggregate.cancelReservation(
				secCtx, req.payerPositionAccountId, req.hubJokeAccountId,
				req.transferAmount, req.currencyCode, req.transferId
			);
			return callback(null, {});
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

	}

	private async _createAccounts(
		call: ServerUnaryCall<GrpcCreateAccountArray, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const createRequests: GrpcCreateAccount[] = call.request.accountsToCreate || [];

		const accounts: {
			requestedId: string, ownerId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string 
		}[] = [];
		
		for(const item of createRequests) {
			// note: we can force values here because the aggregate will control and throw the correct error
			accounts.push({
				requestedId: item.requestedId!,
				ownerId: item.ownerId!,
				accountType: item.type as AccountsAndBalancesAccountType,
				currencyCode: item.currencyCode!
			});
		}

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
		call: ServerUnaryCall<GrpcCreateJournalEntryArray, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const reqEntries: GrpcCreateJournalEntry[] = call.request.entriesToCreate || [];

		const now = Date.now();
		
		const journalEntries: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		}[] = reqEntries.map((item) => {
			// note: we can force values here because the aggregate will control and throw the correct error	
			return {
				requestedId: item.requestedId || randomUUID(),
				amountStr: item.amount!,
				currencyCode: item.currencyCode!,
				creditedAccountId: item.creditedAccountId!,
				debitedAccountId: item.debitedAccountId!,
				ownerId: item.ownerId!,
				pending: item.pending!,
				timestamp: now
			};
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
		call: ServerUnaryCall<GrpcIdArray, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

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
		call: ServerUnaryCall<GrpcId, GrpcAccountArray>,
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
		call: ServerUnaryCall<GrpcId, GrpcJournalEntryArray>,
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

		let journalEntries: AccountsAndBalancesJournalEntry[];
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
		call: ServerUnaryCall<GrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

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
		call: ServerUnaryCall<GrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

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
		call: ServerUnaryCall<GrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

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
			message: error.message || error.constructor.name,
			details: error.message || error.constructor.name,
		};

		if (error instanceof UnauthorizedError) {
			this._logger.warn(`Got UnauthorizedError - message: ${error.message}`);
			srvError.code = status.UNAUTHENTICATED;
		} else if (error instanceof ForbiddenError) {
			this._logger.warn(`Got ForbiddenError - message: ${error.message}`);
			srvError.code = status.PERMISSION_DENIED;
		} else if (error instanceof AccountNotFoundError) {
			this._logger.warn(`Got AccountNotFoundError - message: ${error.message}`);
			srvError.code = status.NOT_FOUND;
		} else {
			this._logger.warn(`Got handled error message - message: ${error.message}`);
			srvError.code = status.UNKNOWN;
		}
		return srvError;
	}
}
