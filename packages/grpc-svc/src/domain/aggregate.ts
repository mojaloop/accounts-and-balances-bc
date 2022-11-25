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
	LedgerAdapterJournalEntry
} from "./infrastructure-types/ledger_adapter";
import {CoaAccount} from "./coa_account";
import {AccountAlreadyExistsError, AccountNotFoundError} from "./errors";
import {Account, JournalEntry} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IChartOfAccountsRepo} from "./infrastructure-types/chart_of_accounts_repo";
import {randomUUID} from "crypto";

export class AccountsAndBalancesAggregate {
	// Properties received through the constructor.
	private logger: ILogger;
	private chartOfAccounts: IChartOfAccountsRepo;
	private ledgerAdapter: ILedgerAdapter;

	constructor(
		logger: ILogger,
		accountsRepo: IChartOfAccountsRepo,
		ledgerAdapter: ILedgerAdapter
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.chartOfAccounts = accountsRepo;
		this.ledgerAdapter = ledgerAdapter;
	}

	async createAccounts(accounts: Account[]): Promise<string[]> {
		// TODO: is there a simpler way to do the following?
		const internalAccountIds: string[] = [];
		accounts.forEach((account) => {
			if (account.id) {
				internalAccountIds.push(account.id);
			}
		});

		const accountsExist: boolean = await this.chartOfAccounts.accountsExistByInternalIds(internalAccountIds);
		if (accountsExist) {
			throw new AccountAlreadyExistsError();
		}

		const coaAccounts: CoaAccount[] = [];
		const ledgerAdapterAccounts: LedgerAdapterAccount[] = [];
		for (const account of accounts) {
			const accountId: string = account.id ?? randomUUID(); // TODO: should this be done? ?? or ||?
			const coaAccount: CoaAccount = {
				internalId: accountId,
				externalId: accountId,
				ownerId: account.ownerId,
				state: account.state,
				type: account.type,
				currencyCode: account.currencyCode,
				currencyDecimals: 0 // TODO: get the currency decimals.
			};
			coaAccounts.push(coaAccount);

			const ledgerAdapterAccount: LedgerAdapterAccount = {
				id: account.id,
				state: account.state,
				type: account.type,
				currencyCode: account.currencyCode,
				debitBalance: account.debitBalance,
				creditBalance: account.creditBalance,
				timestampLastJournalEntry: account.timestampLastJournalEntry
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
			const ledgerAdapterJournalEntry: LedgerAdapterJournalEntry = {
				id: journalEntry.id,
				ownerId: journalEntry.ownerId,
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp
			};
			return ledgerAdapterJournalEntry;
		});

		// TODO: update accounts.
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
		const accountExists: boolean = await this.chartOfAccounts.accountsExistByInternalIds([accountId]);
		if (!accountExists) {
			throw new AccountNotFoundError();
		}

		const ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[] =
			await this.ledgerAdapter.getJournalEntriesByAccountId(accountId);

		const journalEntries: JournalEntry[] = ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const journalEntry: JournalEntry = { // TODO: everything extracted from ledgerAdapterJournalEntry?
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
		const externalAccountIds: string[] = coaAccounts.map((coaAccount) => {
			return coaAccount.externalId;
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
				balance: null, // TODO: the balance has to be calculated according to the account type.
				timestampLastJournalEntry: ledgerAdapterAccount.timestampLastJournalEntry
			};
			return account;
		});
		return accounts;
	}
}
