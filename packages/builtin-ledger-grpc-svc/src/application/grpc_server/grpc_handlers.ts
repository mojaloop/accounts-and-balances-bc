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
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {
	AccountAlreadyExistsError,
	Aggregate,
	CurrencyCodesDifferError,
	InsufficientBalanceError, InvalidAccountStateError, InvalidAccountTypeError,
	InvalidCreditBalanceError,
	InvalidCurrencyCodeError,
	InvalidCurrencyDecimalsError,
	InvalidDebitBalanceError,
	InvalidExternalCategoryError,
	InvalidExternalIdError,
	InvalidIdError,
	InvalidJournalEntryAmountError,
	InvalidTimestampError,
	JournalEntryAlreadyExistsError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	SameDebitedAndCreditedAccountsError,
	UnauthorizedError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {
	GrpcAccount,
	GrpcAccount__Output,
	GrpcId,
	GrpcId__Output,
	GrpcJournalEntryArray__Output,
	GrpcIdArray,
	AccountsAndBalancesGrpcServiceHandlers,
	GrpcGetAccountByIdResponse,
	grpcAccountOutputToAccountDto,
	grpcJournalEntryOutputToJournalEntryDto,
	accountDtoToGrpcAccount,
	journalEntryDtoToGrpcJournalEntry,
	GrpcJournalEntry,
	GrpcGetAccountsByExternalIdResponse,
	GrpcGetJournalEntriesByAccountIdResponse, GrpcJournalEntry__Output,
} from "@mojaloop/accounts-and-balances-bc-grpc-common-lib";
import {ServerUnaryCall, sendUnaryData, status} from "@grpc/grpc-js";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class GrpcHandlers {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: Aggregate;
	// Other properties.
	private static readonly UNKNOWN_ERROR_MESSAGE: string = "unknown error";
	private securityContext: CallSecurityContext = {
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

	getHandlers(): AccountsAndBalancesGrpcServiceHandlers {
		return {
			"CreateAccount": this.createAccount.bind(this),
			"CreateJournalEntries": this.createJournalEntries.bind(this),
			"GetAccountById": this.getAccountById.bind(this),
			"GetAccountsByExternalId": this.getAccountsByExternalId.bind(this),
			"GetJournalEntriesByAccountId": this.getJournalEntriesByAccountId.bind(this)
		};
	}

	private async createAccount(
		call: ServerUnaryCall<GrpcAccount__Output, GrpcId>,
		callback: sendUnaryData<GrpcId>
	): Promise<void> {
		const grpcAccountOutput: GrpcAccount__Output = call.request;
		let accountDto: IAccountDto;
		try {
			accountDto = grpcAccountOutputToAccountDto(grpcAccountOutput);
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		try {
			const accountId: string = await this.aggregate.createAccount(accountDto, this.securityContext);
			const grpcAccountId: GrpcId = {grpcId: accountId};
			callback(null, grpcAccountId);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				callback(
					{code: status.PERMISSION_DENIED, details: error.message},
					null
				);
			} else if (error instanceof InvalidCurrencyDecimalsError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidTimestampError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidDebitBalanceError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidCreditBalanceError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidIdError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidExternalIdError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidAccountStateError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidAccountTypeError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidCurrencyCodeError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof AccountAlreadyExistsError) {
				callback(
					{code: status.ALREADY_EXISTS, details: error.message},
					null
				);
			} else {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null);
			}
		}
	}

	private async createJournalEntries(
		call: ServerUnaryCall<GrpcJournalEntryArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] | undefined = call.request.grpcJournalEntryArray;
		if (grpcJournalEntriesOutput === undefined) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		let journalEntryDtos: IJournalEntryDto[];
		try {
			journalEntryDtos = grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
				return grpcJournalEntryOutputToJournalEntryDto(grpcJournalEntryOutput);
			});
		} catch (error: unknown) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		try {
			const idsJournalEntries: string[] =
				await this.aggregate.createJournalEntries(journalEntryDtos, this.securityContext);
			const grpcIdsJournalEntries: GrpcId[] = idsJournalEntries.map((journalEntryId) => {
				return {grpcId: journalEntryId};
			});
			const grpcIdArray: GrpcIdArray = {grpcIdArray: grpcIdsJournalEntries};
			callback(null, grpcIdArray);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedError) {
				callback(
					{code: status.PERMISSION_DENIED, details: error.message},
					null
				);
			} else if (error instanceof InvalidCurrencyDecimalsError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidTimestampError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidIdError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidExternalIdError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidExternalCategoryError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidCurrencyCodeError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InvalidJournalEntryAmountError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof SameDebitedAndCreditedAccountsError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof NoSuchDebitedAccountError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof NoSuchCreditedAccountError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof CurrencyCodesDifferError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof InsufficientBalanceError) {
				callback(
					{code: status.INVALID_ARGUMENT, details: error.message},
					null
				);
			} else if (error instanceof JournalEntryAlreadyExistsError) {
				callback(
					{code: status.ALREADY_EXISTS, details: error.message},
					null
				);
			} else {
				callback(
					{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE},
					null
				);
			}
		}
	}

	private async getAccountById(
		call: ServerUnaryCall<GrpcId__Output, GrpcGetAccountByIdResponse>,
		callback: sendUnaryData<GrpcGetAccountByIdResponse>
	): Promise<void> {
		const accountId: string | undefined = call.request.grpcId;
		if (accountId === undefined) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		try {
			const accountDto: IAccountDto | null = await this.aggregate.getAccountById(accountId, this.securityContext);

			let grpcGetAccountByIdResponse: GrpcGetAccountByIdResponse;

			if (accountDto === null) {
				grpcGetAccountByIdResponse = {
					accountFound: false,
					grpcAccount: null // This doesn't matter - to the client, it'll be undefined.
				};
				callback(null, grpcGetAccountByIdResponse);
				return;
			}

			const grpcAccount: GrpcAccount = accountDtoToGrpcAccount(accountDto);
			grpcGetAccountByIdResponse = {
				accountFound: true,
				grpcAccount: grpcAccount
			};
			callback(null, grpcGetAccountByIdResponse);
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
		}
	}

	private async getAccountsByExternalId(
		call: ServerUnaryCall<GrpcId__Output, GrpcGetAccountsByExternalIdResponse>,
		callback: sendUnaryData<GrpcGetAccountsByExternalIdResponse>
	): Promise<void> {
		const externalId: string | undefined = call.request.grpcId;
		if (externalId === undefined) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		try {
			const accountDtos: IAccountDto[] =
				await this.aggregate.getAccountsByExternalId(externalId, this.securityContext);

			let grpcGetAccountsByExternalIdResponse: GrpcGetAccountsByExternalIdResponse;

			if (accountDtos.length === 0) {
				grpcGetAccountsByExternalIdResponse = {
					accountsFound: false,
					grpcAccounts: [] // This doesn't matter - to the client, it'll be undefined.
				};
				callback(null, grpcGetAccountsByExternalIdResponse);
				return;
			}

			const grpcAccounts: GrpcAccount[] = accountDtos.map((accountDto) => {
				return accountDtoToGrpcAccount(accountDto);
			});
			grpcGetAccountsByExternalIdResponse = {
				accountsFound: true,
				grpcAccounts: grpcAccounts
			};
			callback(null, grpcGetAccountsByExternalIdResponse);
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
		}
	}

	private async getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId__Output, GrpcGetJournalEntriesByAccountIdResponse>,
		callback: sendUnaryData<GrpcGetJournalEntriesByAccountIdResponse>
	): Promise<void> {
		const accountId: string | undefined = call.request.grpcId;
		if (accountId === undefined) {
			callback(
				{code: status.UNKNOWN, details: GrpcHandlers.UNKNOWN_ERROR_MESSAGE}, // TODO: unknown error?
				null
			);
			return;
		}

		try {
			const journalEntryDtos: IJournalEntryDto[] =
				await this.aggregate.getJournalEntriesByAccountId(accountId, this.securityContext);

			let grpcGetJournalEntriesByAccountIdResponse: GrpcGetJournalEntriesByAccountIdResponse;

			if (journalEntryDtos.length === 0) {
				grpcGetJournalEntriesByAccountIdResponse = {
					journalEntriesFound: false,
					grpcJournalEntries: [] // This doesn't matter - to the client, it'll be undefined.
				};
				callback(null, grpcGetJournalEntriesByAccountIdResponse);
				return;
			}

			const grpcJournalEntries: GrpcJournalEntry[] = journalEntryDtos.map((journalEntryDto) => {
				return journalEntryDtoToGrpcJournalEntry(journalEntryDto);
			});
			grpcGetJournalEntriesByAccountIdResponse = {
				journalEntriesFound: true,
				grpcJournalEntries: grpcJournalEntries
			};
			callback(null, grpcGetJournalEntriesByAccountIdResponse);
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
		}
	}
}
