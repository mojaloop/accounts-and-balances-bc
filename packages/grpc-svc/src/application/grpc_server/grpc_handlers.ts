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
	Empty,
	GrpcAccount,
	GrpcAccount__Output, GrpcAccountArray,
	GrpcAccountArray__Output, GrpcAccountsAndBalancesHandlers,
	GrpcId,
	GrpcId__Output,
	GrpcIdArray,
	GrpcIdArray__Output, GrpcJournalEntry,
	GrpcJournalEntry__Output, GrpcJournalEntryArray,
	GrpcJournalEntryArray__Output
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {AccountsAndBalancesAggregate} from "../../domain/aggregate";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {Account, AccountState, AccountType, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class GrpcHandlers {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: AccountsAndBalancesAggregate;
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
		aggregate: AccountsAndBalancesAggregate
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.aggregate = aggregate;
	}

	getHandlers(): GrpcAccountsAndBalancesHandlers {
		return {
			"CreateAccounts": this.createAccounts.bind(this),
			"CreateJournalEntries": this.createJournalEntries.bind(this),
			"GetAccountsByIds": this.getAccountsByIds.bind(this),
			"GetAccountsByOwnerId": this.getAccountsByOwnerId.bind(this),
			"GetJournalEntriesByAccountId": this.getJournalEntriesByAccountId.bind(this),
			"DeleteAccountsByIds": this.deleteAccountsByIds.bind(this),
			"DeactivateAccountsByIds": this.deactivateAccountsByIds.bind(this),
			"ActivateAccountsByIds": this.activateAccountsByIds.bind(this)
		};
	}

	private async createAccounts(
		call: ServerUnaryCall<GrpcAccountArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const grpcAccountsOutput: GrpcAccount__Output[] = call.request.grpcAccountArray || [];

		const accounts: Account[] = grpcAccountsOutput.map((grpcAccountOutput) => {
			if (
				!grpcAccountOutput.ownerId
				|| !grpcAccountOutput.state
				|| !grpcAccountOutput.type
				|| !grpcAccountOutput.currencyCode
			) {
				throw new Error(); // TODO: create custom error.
			}

			const account: Account = {
				id: grpcAccountOutput.id ?? null, // TODO: ?? or ||?
				ownerId: grpcAccountOutput.ownerId,
				state: grpcAccountOutput.state as AccountState, // TODO: cast?
				type: grpcAccountOutput.type as AccountType, // TODO: cast?
				currencyCode: grpcAccountOutput.currencyCode,
				debitBalance: grpcAccountOutput.debitBalance ?? null, // TODO: ?? or ||?
				creditBalance: grpcAccountOutput.creditBalance ?? null, // TODO: ?? or ||?
				balance: grpcAccountOutput.balance ?? null, // TODO: ?? or ||?
				timestampLastJournalEntry: grpcAccountOutput.timestampLastJournalEntry ?? null // TODO: ?? or ||?
			};
			return account;
		});

		let accountIds: string[];
		try {
			accountIds = await this.aggregate.createAccounts(accounts);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});
		callback(null, {grpcIdArray: grpcAccountIds});
	}

	private async createJournalEntries(
		call: ServerUnaryCall<GrpcJournalEntryArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] = call.request.grpcJournalEntryArray || [];

		const journalEntries: JournalEntry[] = grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
			if (
				!grpcJournalEntryOutput.currencyCode
				|| !grpcJournalEntryOutput.amount
				|| !grpcJournalEntryOutput.debitedAccountId
				|| !grpcJournalEntryOutput.creditedAccountId
			) {
				throw new Error(); // TODO: create custom error.
			}

			const journalEntry: JournalEntry = {
				id: grpcJournalEntryOutput.id ?? null, // TODO: ?? or ||?
				ownerId: grpcJournalEntryOutput.ownerId ?? null, // TODO: ?? or ||?
				currencyCode: grpcJournalEntryOutput.currencyCode,
				amount: grpcJournalEntryOutput.amount,
				debitedAccountId: grpcJournalEntryOutput.debitedAccountId,
				creditedAccountId: grpcJournalEntryOutput.creditedAccountId,
				timestamp: grpcJournalEntryOutput.timestamp ?? null // TODO: ?? or ||?
			};
			return journalEntry;
		});

		let journalEntryIds: string[];
		try {
			journalEntryIds = await this.aggregate.createJournalEntries(journalEntries);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		const grpcJournalEntryIds: GrpcId[] = journalEntryIds.map((journalEntryId) => {
			return {grpcId: journalEntryId};
		});
		callback(null, {grpcIdArray: grpcJournalEntryIds});
	}

	private async getAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId; // TODO: use this auxiliary variable?
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		let accounts: Account[];
		try {
			accounts = await this.aggregate.getAccountsByIds(accountIds);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			return this.accountToGrpcAccount(account);
		});
		callback(null, {grpcAccountArray: grpcAccounts});
	}

	private async getAccountsByOwnerId(
		call: ServerUnaryCall<GrpcId__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const ownerId: string | undefined = call.request.grpcId; // TODO: use this auxiliary variable?
		if (!ownerId) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let accounts: Account[];
		try {
			accounts = await this.aggregate.getAccountsByOwnerId(ownerId);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			return this.accountToGrpcAccount(account);
		});
		callback(null, {grpcAccountArray: grpcAccounts});
	}

	private async getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId__Output, GrpcJournalEntryArray>,
		callback: sendUnaryData<GrpcJournalEntryArray>
	): Promise<void> {
		const accountId: string | undefined = call.request.grpcId; // TODO: use this auxiliary variable?
		if (!accountId) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let journalEntries: JournalEntry[];
		try {
			journalEntries = await this.aggregate.getJournalEntriesByAccountId(accountId);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		const grpcJournalEntries: GrpcJournalEntry[] = journalEntries.map((journalEntry) => {
			const grpcJournalEntry: GrpcJournalEntry = {
				id: journalEntry.id ?? undefined, // TODO: ?? or ||?
				ownerId: journalEntry.ownerId ?? undefined, // TODO: ?? or ||?
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp ?? undefined // TODO: ?? or ||?
			};
			return grpcJournalEntry;
		});
		callback(null, {grpcJournalEntryArray: grpcJournalEntries});
	}

	private async deleteAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId; // TODO: use this auxiliary variable?
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this.aggregate.deleteAccountsByIds(accountIds);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		callback(null, {});
	}

	private async deactivateAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId; // TODO: use this auxiliary variable?
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this.aggregate.deactivateAccountsByIds(accountIds);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		callback(null, {});
	}

	private async activateAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const grpcAccountIdsOutput: GrpcId__Output[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId; // TODO: use this auxiliary variable?
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this.aggregate.activateAccountsByIds(accountIds);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: (error as any).message},
				null
			);
			return;
		}

		callback(null, {});
	}

	private accountToGrpcAccount(account: Account): GrpcAccount {
		const grpcAccount: GrpcAccount = {
			id: account.id ?? undefined, // TODO: ?? or ||?
			ownerId: account.ownerId,
			state: account.state as AccountState, // TODO: cast?
			type: account.type as AccountType, // TODO: cast?
			currencyCode: account.currencyCode,
			debitBalance: account.debitBalance ?? undefined, // TODO: ?? or ||?
			creditBalance: account.creditBalance ?? undefined, // TODO: ?? or ||?
			balance: account.balance ?? undefined, // TODO: ?? or ||?
			timestampLastJournalEntry: account.timestampLastJournalEntry ?? undefined // TODO: ?? or ||?
		};
		return grpcAccount;
	}
}
