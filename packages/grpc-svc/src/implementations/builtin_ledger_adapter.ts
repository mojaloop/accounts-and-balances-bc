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

import {log} from "@grpc/grpc-js/build/src/logging";
import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import {
	ILedgerAdapter,
	LedgerAdapterAccount,
	LedgerAdapterJournalEntry,
	LedgerAdapterRequestId,
} from "../domain/infrastructure-types/ledger_adapter";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcClient,
	BuiltinLedgerGrpcCreateAccountArray,
	BuiltinLedgerGrpcCreateIdsResponse__Output, BuiltinLedgerGrpcCreateJournalEntryArray,
	BuiltinLedgerGrpcId,
	BuiltinLedgerGrpcJournalEntryArray__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {AccountsAndBalancesAccountState, AccountsAndBalancesAccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";


export class BuiltinLedgerAdapter implements ILedgerAdapter {
	private readonly _logger: ILogger;
	private readonly _builtinLedgerClient: BuiltinLedgerGrpcClient;
	private readonly _loginHelper: LoginHelper;

	constructor(url: string, loginHelper: LoginHelper, logger: ILogger) {
		this._logger = logger.createChild(this.constructor.name);
		this._loginHelper = loginHelper;

		this._builtinLedgerClient = new BuiltinLedgerGrpcClient(
			url,
			this._loginHelper,
			this._logger
		);
	}

	async init(): Promise<void> {
		await this._builtinLedgerClient.init();
	}

	async destroy(): Promise<void> {
		await this._builtinLedgerClient.destroy();
	}

	setToken(accessToken: string): void {
		this._loginHelper.setToken(accessToken);
	}

	setUserCredentials(client_id: string, username: string, password: string): void {
		this._loginHelper.setUserCredentials(client_id, username, password);
	}

	setAppCredentials(client_id: string, client_secret: string): void {
		this._loginHelper.setAppCredentials(client_id, client_secret);
	}

	async createAccounts(ledgerAdapterAccounts: LedgerAdapterAccount[]): Promise<string[]> {
		const createRequest: BuiltinLedgerGrpcCreateAccountArray = {
			accountsToCreate: []
		};
		createRequest.accountsToCreate = ledgerAdapterAccounts.map(value => {
			return {
				requestedId: value.id!,
				type: value.type,
				currencyCode: value.currencyCode,
			};
		});


		let createIdsResp: BuiltinLedgerGrpcCreateIdsResponse__Output;
		try {
			createIdsResp = await this._builtinLedgerClient.createAccounts(createRequest);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		if (!createIdsResp.ids) {
			throw new Error();
		}

		const accountIds: string[] =createIdsResp.ids.map(value => value.requestedId!);
		return accountIds;
	}


	async createJournalEntries(ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[]): Promise<string[]> {
		const createRequest: BuiltinLedgerGrpcCreateJournalEntryArray = {
			entriesToCreate: []
		};
		createRequest.entriesToCreate = ledgerAdapterJournalEntries.map(value => {
			return {
				requestedId: value.id!,
				ownerId: value.ownerId!,
				amount: value.amount,
				pending: value.pending,
				creditedAccountId: value.creditedAccountId,
				debitedAccountId: value.debitedAccountId,
				currencyCode: value.currencyCode,
			};
		});


		let createIdsResp: BuiltinLedgerGrpcCreateIdsResponse__Output;
		try {
			createIdsResp = await this._builtinLedgerClient.createJournalEntries(createRequest);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		if (!createIdsResp.ids) {
			throw new Error();
		}

		const accountIds: string[] = createIdsResp.ids.map(value => value.requestedId!);
		return accountIds;
	}


	async getAccountsByIds(ledgerAccountIds: LedgerAdapterRequestId[]): Promise<LedgerAdapterAccount[]> {
		const ids: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId.id};
		});

		let builtinLedgerGrpcAccountArrayOutput: BuiltinLedgerGrpcAccountArray__Output;
		try {
			builtinLedgerGrpcAccountArrayOutput
				= await this._builtinLedgerClient.getAccountsByIds({builtinLedgerGrpcIdArray: ids});
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		if (!builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray) {
			throw new Error();
		}

		const ledgerAdapterAccounts: LedgerAdapterAccount[]
			= builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray
			.map((builtinLedgerGrpcAccountOutput) => {
				const ledgerAdapterAccount: LedgerAdapterAccount = {
					id: builtinLedgerGrpcAccountOutput.id ?? null, // TODO: ?? or ||?
					state: builtinLedgerGrpcAccountOutput.state as AccountsAndBalancesAccountState,
					type: builtinLedgerGrpcAccountOutput.type as AccountsAndBalancesAccountType,
					currencyCode: builtinLedgerGrpcAccountOutput.currencyCode!,
					currencyDecimals: null,
					postedDebitBalance: builtinLedgerGrpcAccountOutput.postedDebitBalance!,
					pendingDebitBalance: builtinLedgerGrpcAccountOutput.pendingDebitBalance!,
					postedCreditBalance: builtinLedgerGrpcAccountOutput.postedCreditBalance!,
					pendingCreditBalance: builtinLedgerGrpcAccountOutput.pendingCreditBalance!,
					timestampLastJournalEntry: builtinLedgerGrpcAccountOutput.timestampLastJournalEntry ?? null // TODO: ?? or ||?
				};
				return ledgerAdapterAccount;
			});
		return ledgerAdapterAccounts;
	}

	// TODO: currency decimals ignored here, right?
	async getJournalEntriesByAccountId(
		ledgerAccountId: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		currencyDecimals: number
	): Promise<LedgerAdapterJournalEntry[]> {
		let builtinLedgerGrpcJournalEntryArrayOutput: BuiltinLedgerGrpcJournalEntryArray__Output;
		try {
			builtinLedgerGrpcJournalEntryArrayOutput
				= await this._builtinLedgerClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: ledgerAccountId});
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		if (!builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray) {
			throw new Error();
		}

		const ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[] =
			builtinLedgerGrpcJournalEntryArrayOutput.builtinLedgerGrpcJournalEntryArray
				.map((builtinLedgerGrpcJournalEntryOutput) => {
					if (
						!builtinLedgerGrpcJournalEntryOutput.currencyCode
						|| !builtinLedgerGrpcJournalEntryOutput.amount
						|| !builtinLedgerGrpcJournalEntryOutput.debitedAccountId
						|| !builtinLedgerGrpcJournalEntryOutput.creditedAccountId
					) {
						throw new Error(); // TODO: create custom error.
					}

					const ledgerAdapterJournalEntry: LedgerAdapterJournalEntry = {
						id: builtinLedgerGrpcJournalEntryOutput.id ?? null, // TODO: ?? or ||?
						ownerId: builtinLedgerGrpcJournalEntryOutput.ownerId ?? null,
						currencyCode: builtinLedgerGrpcJournalEntryOutput.currencyCode,
						currencyDecimals: null, // TODO: null?
						amount: builtinLedgerGrpcJournalEntryOutput.amount,
						pending: builtinLedgerGrpcJournalEntryOutput.pending!,
						debitedAccountId: builtinLedgerGrpcJournalEntryOutput.debitedAccountId,
						creditedAccountId: builtinLedgerGrpcJournalEntryOutput.creditedAccountId,
						timestamp: builtinLedgerGrpcJournalEntryOutput.timestamp ?? null // TODO: ?? or ||?
					};
					return ledgerAdapterJournalEntry;
				});

		return ledgerAdapterJournalEntries;
	}

	async deleteAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId};
		});

		try {
			await this._builtinLedgerClient.deleteAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	async deactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId};
		});

		try {
			await this._builtinLedgerClient
				.deactivateAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	async reactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId};
		});

		try {
			await this._builtinLedgerClient
				.activateAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}
}
