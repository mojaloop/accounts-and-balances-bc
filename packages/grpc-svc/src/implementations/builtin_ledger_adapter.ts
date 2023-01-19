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

import {
	ILedgerAdapter,
	LedgerAdapterAccount,
	LedgerAdapterJournalEntry,
	LedgerAdapterRequestId,
	LedgerError
} from "../domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	BuiltinLedgerGrpcAccount,
	BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcClient,
	BuiltinLedgerGrpcId,
	BuiltinLedgerGrpcIdArray__Output,
	BuiltinLedgerGrpcJournalEntry,
	BuiltinLedgerGrpcJournalEntryArray__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {AccountState, AccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class BuiltinLedgerAdapter implements ILedgerAdapter {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly builtinLedgerClient: BuiltinLedgerGrpcClient;

	constructor(
		logger: ILogger,
		url: string
	) {
		this.logger = logger.createChild(this.constructor.name);

		this.builtinLedgerClient = new BuiltinLedgerGrpcClient(
			logger,
			url
		);
	}

	async init(): Promise<void> {
		await this.builtinLedgerClient.init();
	}

	async destroy(): Promise<void> {
		await this.builtinLedgerClient.destroy();
	}

	// TODO: currency decimals ignored here, right?
	async createAccounts(ledgerAdapterAccounts: LedgerAdapterAccount[]): Promise<string[]> {
		const builtinLedgerGrpcAccounts: BuiltinLedgerGrpcAccount[]
			= ledgerAdapterAccounts.map((ledgerAdapterAccount) => {
			const builtinLedgerGrpcAccount: BuiltinLedgerGrpcAccount = {
				id: ledgerAdapterAccount.id ?? undefined, // TODO: ?? or ||?
				state: ledgerAdapterAccount.state,
				type: ledgerAdapterAccount.type,
				currencyCode: ledgerAdapterAccount.currencyCode,
				debitBalance: ledgerAdapterAccount.debitBalance ?? undefined, // TODO: ?? or ||?
				creditBalance: ledgerAdapterAccount.creditBalance ?? undefined, // TODO: ?? or ||?
				timestampLastJournalEntry: ledgerAdapterAccount.timestampLastJournalEntry ?? undefined // TODO: ?? or ||?
			};
			return builtinLedgerGrpcAccount;
		});

		let builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output;
		try {
			builtinLedgerGrpcIdArrayOutput
				= await this.builtinLedgerClient.createAccounts({builtinLedgerGrpcAccountArray: builtinLedgerGrpcAccounts});
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
		}

		if (!builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray) {
			throw new Error();
		}

		const accountIds: string[] =
			builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray.map((builtinLedgerGrpcIdOutput) => {
				if (!builtinLedgerGrpcIdOutput.builtinLedgerGrpcId) {
					throw new Error();
				}
				return builtinLedgerGrpcIdOutput.builtinLedgerGrpcId;
			});
		return accountIds;
	}

	// TODO: currency decimals ignored here, right?
	async createJournalEntries(ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[]): Promise<string[]> {
		const builtinLedgerGrpcJournalEntries: BuiltinLedgerGrpcJournalEntry[]
			= ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const builtinLedgerGrpcJournalEntry: BuiltinLedgerGrpcJournalEntry = {
				id: ledgerAdapterJournalEntry.id ?? undefined, // TODO: ?? or ||?
				ownerId: ledgerAdapterJournalEntry.ownerId ?? undefined,
				currencyCode: ledgerAdapterJournalEntry.currencyCode,
				amount: ledgerAdapterJournalEntry.amount,
				debitedAccountId: ledgerAdapterJournalEntry.debitedAccountId,
				creditedAccountId: ledgerAdapterJournalEntry.creditedAccountId,
				timestamp: ledgerAdapterJournalEntry.timestamp ?? undefined // TODO: ?? or ||?
			};
			return builtinLedgerGrpcJournalEntry;
		});

		let builtinLedgerGrpcIdArrayOutput: BuiltinLedgerGrpcIdArray__Output;
		try {
			builtinLedgerGrpcIdArrayOutput = await this.builtinLedgerClient.createJournalEntries(
				{builtinLedgerGrpcJournalEntryArray: builtinLedgerGrpcJournalEntries}
			);
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
		}

		if (!builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray) {
			throw new Error();
		}

		const journalEntryIds: string[]
			= builtinLedgerGrpcIdArrayOutput.builtinLedgerGrpcIdArray.map((builtinLedgerGrpcIdOutput) => {
			if (!builtinLedgerGrpcIdOutput.builtinLedgerGrpcId) {
				throw new Error();
			}
			return builtinLedgerGrpcIdOutput.builtinLedgerGrpcId;
		});
		return journalEntryIds;
	}

	// TODO: currency decimals ignored here, right?
	async getAccountsByIds(ledgerAccountIds: LedgerAdapterRequestId[]): Promise<LedgerAdapterAccount[]> {
		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[]
			= ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId.id};
		});

		let builtinLedgerGrpcAccountArrayOutput: BuiltinLedgerGrpcAccountArray__Output;
		try {
			builtinLedgerGrpcAccountArrayOutput
				= await this.builtinLedgerClient.getAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
		}

		if (!builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray) {
			throw new Error();
		}

		const ledgerAdapterAccounts: LedgerAdapterAccount[]
			= builtinLedgerGrpcAccountArrayOutput.builtinLedgerGrpcAccountArray
			.map((builtinLedgerGrpcAccountOutput) => {
				if (
					!builtinLedgerGrpcAccountOutput.state
					|| !builtinLedgerGrpcAccountOutput.type
					|| !builtinLedgerGrpcAccountOutput.currencyCode
					|| !builtinLedgerGrpcAccountOutput.debitBalance
					|| !builtinLedgerGrpcAccountOutput.creditBalance
				) {
					throw new Error(); // TODO: create custom error.
				}

				const ledgerAdapterAccount: LedgerAdapterAccount = {
					id: builtinLedgerGrpcAccountOutput.id ?? null, // TODO: ?? or ||?
					state: builtinLedgerGrpcAccountOutput.state as AccountState,
					type: builtinLedgerGrpcAccountOutput.type as AccountType,
					currencyCode: builtinLedgerGrpcAccountOutput.currencyCode,
					currencyDecimals: null, // TODO: null?
					debitBalance: builtinLedgerGrpcAccountOutput.debitBalance,
					creditBalance: builtinLedgerGrpcAccountOutput.creditBalance,
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
				= await this.builtinLedgerClient.getJournalEntriesByAccountId({builtinLedgerGrpcId: ledgerAccountId});
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
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
			await this.builtinLedgerClient.deleteAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
		}
	}

	async deactivateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId};
		});

		try {
			await this.builtinLedgerClient
				.deactivateAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
		}
	}

	async activateAccountsByIds(ledgerAccountIds: string[]): Promise<void> {
		const builtinLedgerGrpcAccountIds: BuiltinLedgerGrpcId[] = ledgerAccountIds.map((ledgerAccountId) => {
			return {builtinLedgerGrpcId: ledgerAccountId};
		});

		try {
			await this.builtinLedgerClient
				.activateAccountsByIds({builtinLedgerGrpcIdArray: builtinLedgerGrpcAccountIds});
		} catch (error: unknown) {
			throw new LedgerError((error as any)?.message);
		}
	}
}
