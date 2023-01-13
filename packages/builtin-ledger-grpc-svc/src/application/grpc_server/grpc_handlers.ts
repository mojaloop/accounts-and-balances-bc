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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ServerUnaryCall, sendUnaryData, status} from "@grpc/grpc-js";
import {
	BLAccountAlreadyExistsError,
	BLAccountNotFoundError,
	BuiltinLedgerAccountDto,
	BuiltinLedgerJournalEntryDto,
	BLCreditedAccountNotFoundError,
	BLCurrencyCodesDifferError,
	BLDebitedAccountNotFoundError,
	BLInvalidCreditBalanceError,
	BLInvalidCurrencyCodeError,
	BLInvalidDebitBalanceError,
	BLInvalidIdError,
	BLInvalidJournalEntryAmountError,
	BLInvalidTimestampError,
	BLJournalEntryAlreadyExistsError,
	BLSameDebitedAndCreditedAccountsError,
	BLUnauthorizedError,
	BLInvalidAccountStateError,
	BLInvalidAccountTypeError,
	BLDebitsExceedCreditsError,
	BLCreditsExceedDebitsError
} from "../../domain";
import {BuiltinLedgerAggregate} from "../../domain/aggregate";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {
	BuiltinLedgerGrpcAccount,
	BuiltinLedgerGrpcAccount__Output,
	BuiltinLedgerGrpcAccountArray,
	BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcId,
	BuiltinLedgerGrpcId__Output,
	BuiltinLedgerGrpcIdArray,
	BuiltinLedgerGrpcIdArray__Output,
	BuiltinLedgerGrpcJournalEntry, BuiltinLedgerGrpcJournalEntry__Output,
	BuiltinLedgerGrpcJournalEntryArray,
	BuiltinLedgerGrpcJournalEntryArray__Output,
	Empty,
	GrpcBuiltinLedgerHandlers
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {AccountState, AccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class GrpcHandlers {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: BuiltinLedgerAggregate;
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
		aggregate: BuiltinLedgerAggregate
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.aggregate = aggregate;
	}

	getHandlers(): GrpcBuiltinLedgerHandlers {
		return {
			"CreateAccounts": this.createAccounts.bind(this),
			"CreateJournalEntries": this.createJournalEntries.bind(this),
			"GetAccountsByIds": this.getAccountsByIds.bind(this),
			"GetJournalEntriesByAccountId": this.getJournalEntriesByAccountId.bind(this),
			"DeleteAccountsByIds": this.deleteAccountsByIds.bind(this),
			"DeactivateAccountsByIds": this.deactivateAccountsByIds.bind(this),
			"ActivateAccountsByIds": this.activateAccountsByIds.bind(this)
		};
	}

	private async createAccounts(
		call: ServerUnaryCall<BuiltinLedgerGrpcAccountArray__Output, BuiltinLedgerGrpcIdArray>,
		callback: sendUnaryData<BuiltinLedgerGrpcIdArray>
	): Promise<void> {
		const builtinLedgerGrpcAccountsOutput: BuiltinLedgerGrpcAccount__Output[]
			= call.request.builtinLedgerGrpcAccountArray || [];

		const builtinLedgerAccountDtos: BuiltinLedgerAccountDto[]
			= builtinLedgerGrpcAccountsOutput.map((builtinLedgerGrpcAccountOutput) => {
			if (!builtinLedgerGrpcAccountOutput.currencyCode) {
				throw new Error(); // TODO: create custom error.
			}

			const builtinLedgerAccountDto: BuiltinLedgerAccountDto = {
				id: builtinLedgerGrpcAccountOutput.id ?? null, // TODO: ?? or ||?
				state: builtinLedgerGrpcAccountOutput.state as AccountState, // TODO: cast?
				type: builtinLedgerGrpcAccountOutput.type as AccountType, // TODO: cast?
				currencyCode: builtinLedgerGrpcAccountOutput.currencyCode,
				debitBalance: builtinLedgerGrpcAccountOutput.debitBalance ?? null, // TODO: ?? or ||?
				creditBalance: builtinLedgerGrpcAccountOutput.creditBalance ?? null, // TODO: ?? or ||?
				timestampLastJournalEntry: builtinLedgerGrpcAccountOutput.timestampLastJournalEntry ?? null // TODO: ?? or ||?
			};
			return builtinLedgerAccountDto;
		});

		let accountIds: string[];
		try {
			accountIds = await this.aggregate.createAccounts(builtinLedgerAccountDtos, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			} else if (error instanceof BLAccountAlreadyExistsError) {
				grpcError = {code: status.ALREADY_EXISTS, details: error.message};
			} else if (
				error instanceof BLInvalidAccountStateError
				|| error instanceof BLInvalidDebitBalanceError
				|| error instanceof BLInvalidCreditBalanceError
				|| error instanceof BLInvalidTimestampError
				|| error instanceof BLInvalidIdError
				|| error instanceof BLInvalidAccountTypeError
				|| error instanceof BLInvalidCurrencyCodeError
			) {
				grpcError = {code: status.INVALID_ARGUMENT, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[] = accountIds.map((accountId) => {
			return {builtinLedgerGrpcId: accountId};
		});
		callback(null, {builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
	}

	private async createJournalEntries(
		call: ServerUnaryCall<BuiltinLedgerGrpcJournalEntryArray__Output, BuiltinLedgerGrpcIdArray>,
		callback: sendUnaryData<BuiltinLedgerGrpcIdArray>
	): Promise<void> {
		const builtinLedgerGrpcJournalEntriesOutput: BuiltinLedgerGrpcJournalEntry__Output[]
			= call.request.builtinLedgerGrpcJournalEntryArray || [];

		const builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[]
			= builtinLedgerGrpcJournalEntriesOutput.map((builtinLedgerGrpcJournalEntryOutput) => {
			if (
				!builtinLedgerGrpcJournalEntryOutput.currencyCode
				|| !builtinLedgerGrpcJournalEntryOutput.amount
				|| !builtinLedgerGrpcJournalEntryOutput.debitedAccountId
				|| !builtinLedgerGrpcJournalEntryOutput.creditedAccountId
			) {
				throw new Error(); // TODO: create custom error.
			}

			const builtinLedgerJournalEntryDto: BuiltinLedgerJournalEntryDto = {
				id: builtinLedgerGrpcJournalEntryOutput.id ?? null, // TODO: ?? or ||?
				ownerId: builtinLedgerGrpcJournalEntryOutput.ownerId ?? null,
				currencyCode: builtinLedgerGrpcJournalEntryOutput.currencyCode,
				amount: builtinLedgerGrpcJournalEntryOutput.amount,
				debitedAccountId: builtinLedgerGrpcJournalEntryOutput.debitedAccountId,
				creditedAccountId: builtinLedgerGrpcJournalEntryOutput.creditedAccountId,
				timestamp: builtinLedgerGrpcJournalEntryOutput.timestamp ?? null // TODO: ?? or ||?
			};
			return builtinLedgerJournalEntryDto;
		});

		let journalEntryIds: string[];
		try {
			journalEntryIds
				= await this.aggregate.createJournalEntries(builtinLedgerJournalEntryDtos, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			} else if (
				error instanceof BLDebitedAccountNotFoundError
				|| error instanceof BLCreditedAccountNotFoundError
			) {
				grpcError = {code: status.NOT_FOUND, details: error.message};
			} else if (error instanceof BLJournalEntryAlreadyExistsError) {
				grpcError = {code: status.ALREADY_EXISTS, details: error.message};
			} else if (
				error instanceof BLInvalidTimestampError
				|| error instanceof BLInvalidIdError
				|| error instanceof BLInvalidCurrencyCodeError
				|| error instanceof BLInvalidJournalEntryAmountError
				|| error instanceof BLSameDebitedAndCreditedAccountsError
				|| error instanceof BLCurrencyCodesDifferError
				// CurrencyDecimalsDifferError is "ignored" on purpose.
				|| error instanceof BLDebitsExceedCreditsError
				|| error instanceof BLCreditsExceedDebitsError
			) {
				grpcError = {code: status.INVALID_ARGUMENT, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		const builtinLedgerGrpcJournalEntryIds: BuiltinLedgerGrpcId[] = journalEntryIds.map((journalEntryId) => {
			return {builtinLedgerGrpcId: journalEntryId};
		});
		callback(null, {builtinLedgerGrpcIdArray: builtinLedgerGrpcJournalEntryIds});
	}

	private async getAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray__Output, BuiltinLedgerGrpcAccountArray>,
		callback: sendUnaryData<BuiltinLedgerGrpcAccountArray>
	): Promise<void> {
		const builtinLedgerGrpcAccountIdsOutput: BuiltinLedgerGrpcId__Output[]
			= call.request.builtinLedgerGrpcIdArray || [];

		const accountIds: string[] = [];
		for (const builtinLedgerGrpcAccountIdOutput of builtinLedgerGrpcAccountIdsOutput) {
			// const accountId: string | undefined = builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId; TODO: use this auxiliary variable?
			if (!builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId);
		}

		let builtinLedgerAccountDtos: BuiltinLedgerAccountDto[];
		try {
			builtinLedgerAccountDtos = await this.aggregate.getAccountsByIds(accountIds, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		const builtinLedgerGrpcAccounts: BuiltinLedgerGrpcAccount[]
			= builtinLedgerAccountDtos.map((builtinLedgerAccountDto) => {
			const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
				id: builtinLedgerAccountDto.id ?? undefined, // TODO: ?? or ||?
				state: builtinLedgerAccountDto.state,
				type: builtinLedgerAccountDto.type,
				currencyCode: builtinLedgerAccountDto.currencyCode,
				debitBalance: builtinLedgerAccountDto.debitBalance ?? undefined, // TODO: ?? or ||?
				creditBalance: builtinLedgerAccountDto.creditBalance ?? undefined, // TODO: ?? or ||?
				timestampLastJournalEntry: builtinLedgerAccountDto.timestampLastJournalEntry ?? undefined // TODO: ?? or ||?
			};
			return builtinLedgerGrpcAccount;
		});
		callback(null, {builtinLedgerGrpcAccountArray: builtinLedgerGrpcAccounts});
	}

	private async getJournalEntriesByAccountId(
		call: ServerUnaryCall<BuiltinLedgerGrpcId__Output, BuiltinLedgerGrpcJournalEntryArray>,
		callback: sendUnaryData<BuiltinLedgerGrpcJournalEntryArray>
	): Promise<void> {
		const accountId: string | undefined = call.request.builtinLedgerGrpcId;
		if (!accountId) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[];
		try {
			builtinLedgerJournalEntryDtos
				= await this.aggregate.getJournalEntriesByAccountId(accountId, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		const builtinLedgerGrpcJournalEntries: BuiltinLedgerGrpcJournalEntry[]
			= builtinLedgerJournalEntryDtos.map((builtinLedgerJournalEntryDto) => {
			const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
				id: builtinLedgerJournalEntryDto.id ?? undefined, // TODO: ?? or ||?
				currencyCode: builtinLedgerJournalEntryDto.currencyCode,
				amount: builtinLedgerJournalEntryDto.amount,
				debitedAccountId: builtinLedgerJournalEntryDto.debitedAccountId,
				creditedAccountId: builtinLedgerJournalEntryDto.creditedAccountId,
				timestamp: builtinLedgerJournalEntryDto.timestamp ?? undefined // TODO: ?? or ||?
			};
			return builtinLedgerGrpcJournalEntry;
		});
		callback(null, {builtinLedgerGrpcJournalEntryArray: builtinLedgerGrpcJournalEntries});
	}

	private async deleteAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const builtinLedgerGrpcAccountIdsOutput: BuiltinLedgerGrpcId__Output[]
			= call.request.builtinLedgerGrpcIdArray || [];

		const accountIds: string[] = [];
		for (const builtinLedgerGrpcAccountIdOutput of builtinLedgerGrpcAccountIdsOutput) {
			// const accountId: string | undefined = builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId; TODO: use this auxiliary variable?
			if (!builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId);
		}

		try {
			await this.aggregate.deleteAccountsByIds(accountIds, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			} else if (error instanceof BLAccountNotFoundError) {
				grpcError = {code: status.NOT_FOUND, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		callback(null, {});
	}

	private async deactivateAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const builtinLedgerGrpcAccountIdsOutput: BuiltinLedgerGrpcId__Output[]
			= call.request.builtinLedgerGrpcIdArray || [];

		const accountIds: string[] = [];
		for (const builtinLedgerGrpcAccountIdOutput of builtinLedgerGrpcAccountIdsOutput) {
			// const accountId: string | undefined = builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId; TODO: use this auxiliary variable?
			if (!builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId);
		}

		try {
			await this.aggregate.deactivateAccountsByIds(accountIds, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			} else if (error instanceof BLAccountNotFoundError) {
				grpcError = {code: status.NOT_FOUND, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		callback(null, {});
	}

	private async activateAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const builtinLedgerGrpcAccountIdsOutput: BuiltinLedgerGrpcId__Output[]
			= call.request.builtinLedgerGrpcIdArray || [];

		const accountIds: string[] = [];
		for (const builtinLedgerGrpcAccountIdOutput of builtinLedgerGrpcAccountIdsOutput) {
			// const accountId: string | undefined = builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId; TODO: use this auxiliary variable?
			if (!builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId) {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId);
		}

		try {
			await this.aggregate.activateAccountsByIds(accountIds, this.securityContext);
		} catch (error: unknown) {
			let grpcError = {code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE};
			if (error instanceof BLUnauthorizedError) {
				grpcError = {code: status.PERMISSION_DENIED, details: error.message};
			} else if (error instanceof BLAccountNotFoundError) {
				grpcError = {code: status.NOT_FOUND, details: error.message};
			}
			callback(grpcError, null);
			return;
		}

		callback(null, {});
	}
}
