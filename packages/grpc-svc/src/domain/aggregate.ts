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
import {
	ILedgerAdapter,
	LedgerAdapterAccount,
	LedgerAdapterJournalEntry, LedgerAdapterRequestId
} from "./infrastructure-types/ledger_adapter";
import {CoaAccount} from "./coa_account";
import {AccountAlreadyExistsError, AccountNotFoundError} from "./errors";
import {Account, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IChartOfAccountsRepo} from "./infrastructure-types/chart_of_accounts_repo";
import {randomUUID} from "crypto";
import {join} from "path";
import {readFileSync} from "fs";
import {InvalidCurrencyCodeError} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain/errors";

export class AccountsAndBalancesAggregate {
	// Properties received through the constructor.
	private logger: ILogger;
	private chartOfAccounts: IChartOfAccountsRepo;
	private ledgerAdapter: ILedgerAdapter;
	private readonly currencies: {code: string, decimals: number}[];
	// Other properties.
	private static readonly CURRENCIES_FILE_NAME: string = "currencies.json";

	constructor(
		logger: ILogger,
		accountsRepo: IChartOfAccountsRepo,
		ledgerAdapter: ILedgerAdapter
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.chartOfAccounts = accountsRepo;
		this.ledgerAdapter = ledgerAdapter;

		// TODO: here?
		const currenciesFileAbsolutePath: string = join(__dirname, AccountsAndBalancesAggregate.CURRENCIES_FILE_NAME);
		try {
			this.currencies = JSON.parse(readFileSync(currenciesFileAbsolutePath, "utf-8"));
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
	}

	async createAccounts(accounts: Account[]): Promise<string[]> {
		// TODO: is there a simpler way to do the following?
		const internalAccountIds: string[] = [];
		accounts.forEach((account) => {
			if (account.id) {
				internalAccountIds.push(account.id);
			}
		});

		if (internalAccountIds.length) { // TODO: use "!==0" instead?
			const accountsExist: boolean = await this.chartOfAccounts.accountsExistByInternalIds(internalAccountIds);
			if (accountsExist) {
				throw new AccountAlreadyExistsError();
			}
		}

		const coaAccounts: CoaAccount[] = [];
		const ledgerAdapterAccounts: LedgerAdapterAccount[] = [];
		for (const account of accounts) {
			const accountId: string = account.id ?? randomUUID(); // TODO: should this be done? ?? or ||?

			const currency: {code: string, decimals: number} | undefined
				= this.currencies.find((currency) => {
				return currency.code === account.currencyCode;
			});
			if (!currency) {
				throw new InvalidCurrencyCodeError();
			}

			const coaAccount: CoaAccount = {
				internalId: accountId,
				externalId: accountId,
				ownerId: account.ownerId,
				state: account.state,
				type: account.type,
				currencyCode: account.currencyCode,
				currencyDecimals: currency.decimals
			};
			coaAccounts.push(coaAccount);

			const ledgerAdapterAccount: LedgerAdapterAccount = {
				id: account.id,
				state: account.state,
				type: account.type,
				currencyCode: account.currencyCode,
				currencyDecimals: coaAccount.currencyDecimals,
				debitBalance: null,
				creditBalance: null,
				timestampLastJournalEntry: null
			};
			ledgerAdapterAccounts.push(ledgerAdapterAccount);
		}

		const accountIds: string[] = await this.ledgerAdapter.createAccounts(ledgerAdapterAccounts);

		await this.chartOfAccounts.storeAccounts(coaAccounts);

		return accountIds;
	}

	async createJournalEntries(journalEntries: JournalEntry[]): Promise<string[]> {
		const ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[]
			= journalEntries.map((journalEntry) => {
			const currency: {code: string, decimals: number} | undefined
				= this.currencies.find((currency) => {
				return currency.code === journalEntry.currencyCode;
			});
			if (!currency) {
				throw new InvalidCurrencyCodeError();
			}

			const ledgerAdapterJournalEntry: LedgerAdapterJournalEntry = {
				id: journalEntry.id,
				ownerId: journalEntry.ownerId,
				currencyCode: journalEntry.currencyCode,
				currencyDecimals: currency.decimals,
				amount: journalEntry.amount,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp
			};
			return ledgerAdapterJournalEntry;
		});

		const journalEntryIds: string[] = await this.ledgerAdapter.createJournalEntries(ledgerAdapterJournalEntries);
		return journalEntryIds;
	}

	async getAccountsByIds(accountIds: string[]): Promise<Account[]> {
		const coaAccounts: CoaAccount[] = await this.chartOfAccounts.getAccountsByInternalIds(accountIds);

		const accounts: Account[] = await this.getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

	async getAccountsByOwnerId(ownerId: string): Promise<Account[]> {
		const coaAccounts: CoaAccount[] = await this.chartOfAccounts.getAccountsByOwnerId(ownerId);

		const accounts: Account[] = await this.getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<JournalEntry[]> {
		const coaAccount: CoaAccount | undefined =
			(await this.chartOfAccounts.getAccountsByInternalIds([accountId]))[0];
		if (!coaAccount) {
			throw new AccountNotFoundError();
		}

		const ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[] =
			await this.ledgerAdapter.getJournalEntriesByAccountId(accountId, coaAccount.currencyDecimals);

		const journalEntries: JournalEntry[] = ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const journalEntry: JournalEntry = {
				id: ledgerAdapterJournalEntry.id,
				ownerId: ledgerAdapterJournalEntry.ownerId,
				currencyCode: ledgerAdapterJournalEntry.currencyCode,
				amount: ledgerAdapterJournalEntry.amount,
				debitedAccountId: ledgerAdapterJournalEntry.debitedAccountId,
				creditedAccountId: ledgerAdapterJournalEntry.creditedAccountId,
				timestamp: ledgerAdapterJournalEntry.timestamp
			};
			return journalEntry;
		});
		return journalEntries;
	}

	private async getAccountsByExternalIdsOfCoaAccounts(coaAccounts: CoaAccount[]): Promise<Account[]> {
		const externalAccountIds: LedgerAdapterRequestId[] = coaAccounts.map((coaAccount) => { // TODO: change array name.
			return {id: coaAccount.externalId, currencyDecimals: coaAccount.currencyDecimals};
		});

		const ledgerAdapterAccounts: LedgerAdapterAccount[]
			= await this.ledgerAdapter.getAccountsByIds(externalAccountIds);

		const accounts: Account[] = ledgerAdapterAccounts.map((ledgerAdapterAccount) => {
			const coaAccount: CoaAccount | undefined = coaAccounts.find((coaAccount) => {
				return coaAccount.externalId === ledgerAdapterAccount.id;
			});
			if (!coaAccount) {
				throw new Error(); // TODO: create custom error.
			}

			const account: Account = {
				id: coaAccount.internalId,
				ownerId: coaAccount.ownerId,
				state: coaAccount.state,
				type: coaAccount.type,
				currencyCode: coaAccount.currencyCode,
				debitBalance: ledgerAdapterAccount.debitBalance,
				creditBalance: ledgerAdapterAccount.creditBalance,
				balance: this.calculateBalance(ledgerAdapterAccount.debitBalance, ledgerAdapterAccount.creditBalance, coaAccount.currencyDecimals),
				timestampLastJournalEntry: ledgerAdapterAccount.timestampLastJournalEntry
			};
			return account;
		});
		return accounts;
	}

	private calculateBalance(debitBalance: string | null, creditBalance: string | null, currencyDecimals: number): string | null {
		// TODO: check for null inputs and return null.
		if (!debitBalance || !creditBalance) {
			return null;
		}
		const balance: bigint = BigInt(debitBalance) - BigInt(creditBalance);
		return balance.toString();
	}
}
