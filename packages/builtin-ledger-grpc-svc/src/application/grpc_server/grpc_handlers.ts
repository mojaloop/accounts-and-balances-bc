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
import {ServerUnaryCall, sendUnaryData, status} from "@grpc/grpc-js";
import {
	GrpcAccount,
	GrpcAccount__Output, GrpcAccountArray,
	GrpcAccountArray__Output,
	GrpcBuiltinLedgerHandlers,
	GrpcId,
	GrpcId__Output,
	GrpcIdArray,
	GrpcIdArray__Output,
	GrpcJournalEntry,
	GrpcJournalEntry__Output, GrpcJournalEntryArray,
	GrpcJournalEntryArray__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {UnauthorizedError} from "../../domain/errors";
import {Aggregate} from "../../domain/aggregate";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";

export class GrpcHandlers {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: Aggregate;
	// Other properties.
	private static readonly UNKNOWN_ERROR_MESSAGE: string = "unknown error";
	private readonly securityContext: CallSecurityContext = {
		username: "",
		clientId: "",
		rolesIds: [""],
		accessToken: ""
	};

	constructor(
		logger: ILogger,
		aggregate: Aggregate
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.aggregate = aggregate;
	}

	getHandlers(): GrpcBuiltinLedgerHandlers {
		return {
			"CreateAccounts": this.createAccounts.bind(this),
			"CreateJournalEntries": this.createJournalEntries.bind(this),
			"GetAccountsByIds": this.getAccountsByIds.bind(this),
			"GetJournalEntriesByAccountId": this.getJournalEntriesByAccountId.bind(this)
		};
	}

	private async createAccounts(
		call: ServerUnaryCall<GrpcAccountArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const grpcAccountsOutput: GrpcAccount__Output[] = call.request.grpcAccountArray || []; // TODO: assume that there's no error?

		let accountIds: string[];
		try {
			accountIds = await this.aggregate.createAccounts(grpcAccountsOutput, this.securityContext);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				callback(
					{code: status.PERMISSION_DENIED, details: error.message},
					null
				);
			} else {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
			}
			return;
		}

		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId}; // TODO: return object directly?
		});
		// const grpcIdArray: GrpcIdArray = {grpcIdArray: grpcAccountIds};
		callback(null, {grpcIdArray: grpcAccountIds}); // TODO: pass object directly?
	}

	private async createJournalEntries(
		call: ServerUnaryCall<GrpcJournalEntryArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] = call.request.grpcJournalEntryArray || []; // TODO: assume that there's no error?

		let journalEntryIds: string[];
		try {
			journalEntryIds = await this.aggregate.createJournalEntries(grpcJournalEntriesOutput, this.securityContext);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				callback(
					{code: status.PERMISSION_DENIED, details: error.message},
					null
				);
			} else {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
			}
			return;
		}

		const grpcJournalEntryIds: GrpcId[] = journalEntryIds.map((journalEntryId) => {
			return {grpcId: journalEntryId}; // TODO: return object directly?
		});
		// const grpcIdArray: GrpcIdArray = {grpcIdArray: grpcJournalEntryIds};
		callback(null, {grpcIdArray: grpcJournalEntryIds}); // TODO: pass object directly?
	}

	private async getAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || []; // TODO: assume that there's no error?

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId;
			if (!grpcAccountIdOutput.grpcId) { // TODO: handle this case? use accountId aux variable?
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		let grpcAccounts: GrpcAccount[];
		try {
			grpcAccounts = await this.aggregate.getAccountsByIds(accountIds, this.securityContext);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				callback(
					{code: status.PERMISSION_DENIED, details: error.message},
					null
				);
			} else {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
			}
			return;
		}

		callback(null, {grpcAccountArray: grpcAccounts}); // TODO: pass object directly?
	}

	private async getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId__Output, GrpcJournalEntryArray>,
		callback: sendUnaryData<GrpcJournalEntryArray>
	): Promise<void> {
		const accountId: string | undefined = call.request.grpcId;
		if (!accountId) { // TODO: handle this case?
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		let grpcJournalEntries: GrpcJournalEntry[];
		try {
			grpcJournalEntries = await this.aggregate.getJournalEntriesByAccountId(accountId, this.securityContext);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				callback(
					{code: status.PERMISSION_DENIED, details: error.message},
					null
				);
			} else {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
			}
			return;
		}

		callback(null, {grpcJournalEntryArray: grpcJournalEntries}); // TODO: pass object directly?
	}
}
