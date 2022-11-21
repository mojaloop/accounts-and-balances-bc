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
import {ILedgerAdapter, LedgerAccount, LedgerJournalEntry} from "./infrastructure-types/ledger";
import {
	AccountDto,
	AccountState,
	AccountType,
	JournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IAccountsRepo} from "./infrastructure-types/accounts_repo";
import {Account} from "./account";
import {AccountAlreadyExistsError, AccountNotFoundError} from "./errors";

export class AccountsAndBalancesAggregate {
	// Properties received through the constructor.
	private logger: ILogger;
	private accountsRepo: IAccountsRepo;
	private ledgerAdapter: ILedgerAdapter;

	constructor(
		logger: ILogger,
		accountsRepo: IAccountsRepo,
		ledgerAdapter: ILedgerAdapter
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.accountsRepo = accountsRepo;
		this.ledgerAdapter = ledgerAdapter;
	}

	async createAccounts(accountDtos: AccountDto[]): Promise<string[]> {
		const accountIds: string[] = [];
		accountDtos.forEach((accountDto) => {
			if (accountDto.id) {
				accountIds.push(accountDto.id);
			}
		});

		const accountsExist: boolean = await this.accountsRepo.accountsExistByInternalIds(accountIds);
		if (accountsExist) {
			throw new AccountAlreadyExistsError();
		}

		const ledgerAccounts: LedgerAccount[] = accountDtos.map((accountDto) => {
			const ledgerAccount: LedgerAccount = {
				id: accountDto.id,
				state: accountDto.state,
				type: accountDto.type,
				currencyCode: accountDto.currencyCode,
				debitBalance: accountDto.debitBalance || "0", // TODO: should this be done? should LedgerAccount be changed?
				creditBalance: accountDto.creditBalance || "0", // TODO: should this be done? should LedgerAccount be changed?
				balance: accountDto.balance || "0", // TODO: should this be done? should LedgerAccount be changed?
				timestampLastJournalEntry: accountDto.timestampLastJournalEntry
			};
			return ledgerAccount; // TODO: return object directly instead?
		});

		const ledgerAccountIds: string[] = await this.ledgerAdapter.createAccounts(ledgerAccounts);

		const accounts: Account[] = [];
		for (let i = 0; i < accountDtos.length; i++) {
			const account: Account = {
				internalId: accountIds[i],
				externalId: ledgerAccountIds[i],
				ownerId: accountDtos[i].ownerId,
				state: accountDtos[i].state,
				type: accountDtos[i].type,
				currencyCode: accountDtos[i].currencyCode,
				currencyDecimals: 0 // TODO: get the currency decimals.
			};
			accounts.push(account); // TODO: push object directly instead?
		}

		await this.accountsRepo.storeAccounts(accounts);

		return accountIds;
	}

	async createJournalEntries(journalEntryDtos: JournalEntryDto[]): Promise<string[]> {
		const ledgerJournalEntries: LedgerJournalEntry[] = journalEntryDtos.map((journalEntryDto) => {
			const ledgerJournalEntry: LedgerJournalEntry = {
				id: journalEntryDto.id,
				currencyCode: journalEntryDto.currencyCode,
				amount: journalEntryDto.amount,
				debitedAccountId: journalEntryDto.debitedAccountId,
				creditedAccountId: journalEntryDto.creditedAccountId,
				timestamp: journalEntryDto.timestamp
			};
			return ledgerJournalEntry; // TODO: return object directly instead?
		});

		const ledgerJournalEntryIds: string[] = await this.ledgerAdapter.createJournalEntries(ledgerJournalEntries);
		return ledgerJournalEntryIds;
	}

	async getAccountsByIds(idsAccounts: string[]): Promise<AccountDto[]> {
		const accounts: Account[] = await this.accountsRepo.getAccountsByInternalIds(idsAccounts);

		const idsLedgerAccounts: string[] = accounts.map((account) => {
			return account.externalId;
		});

		const ledgerAccounts: LedgerAccount[] = await this.ledgerAdapter.getAccountsByIds(idsLedgerAccounts);

		const accountDtos: AccountDto[] = ledgerAccounts.map((ledgerAccount) => {
			const accountDto: AccountDto = {
				id: ledgerAccount.id,
				ownerId: "", // TODO: get the ownerId.
				state: ledgerAccount.state as AccountState, // TODO: remove cast.
				type: ledgerAccount.type as AccountType, // TODO: remove cast.
				currencyCode: ledgerAccount.currencyCode,
				debitBalance: ledgerAccount.debitBalance,
				creditBalance: ledgerAccount.creditBalance,
				balance: ledgerAccount.balance,
				timestampLastJournalEntry: ledgerAccount.timestampLastJournalEntry
			};
			return accountDto;
		});
		return accountDtos;
	}

	async getAccountsByOwnerId(ownerId: string): Promise<AccountDto[]> {
		const accounts: Account[] = await this.accountsRepo.getAccountsByOwnerId(ownerId);

		const idsLedgerAccounts: string[] = accounts.map((account) => {
			return account.externalId;
		});

		const ledgerAccounts: LedgerAccount[] = await this.ledgerAdapter.getAccountsByIds(idsLedgerAccounts);

		const accountDtos: AccountDto[] = ledgerAccounts.map((ledgerAccount) => {
			const accountDto: AccountDto = {
				id: ledgerAccount.id,
				ownerId: "", // TODO: get the ownerId.
				state: ledgerAccount.state as AccountState, // TODO: remove cast.
				type: ledgerAccount.type as AccountType, // TODO: remove cast.
				currencyCode: ledgerAccount.currencyCode,
				debitBalance: ledgerAccount.debitBalance,
				creditBalance: ledgerAccount.creditBalance,
				balance: ledgerAccount.balance,
				timestampLastJournalEntry: ledgerAccount.timestampLastJournalEntry
			};
			return accountDto; // TODO: return object directly instead?
		});
		return accountDtos;
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<JournalEntryDto[]> {
		const accountExists: boolean = await this.accountsRepo.accountsExistByInternalIds([accountId]);
		if (!accountExists) {
			throw new AccountNotFoundError();
		}

		const ledgerJournalEntries: LedgerJournalEntry[] =
			await this.ledgerAdapter.getJournalEntriesByAccountId(accountId);

		const journalEntryDtos: JournalEntryDto[] = ledgerJournalEntries.map((ledgerJournalEntry) => {
			const journalEntryDto: JournalEntryDto = {
				id: ledgerJournalEntry.id,
				ownerId: "", // TODO: get the ownerId.
				currencyCode: ledgerJournalEntry.currencyCode,
				amount: ledgerJournalEntry.amount,
				debitedAccountId: ledgerJournalEntry.debitedAccountId,
				creditedAccountId: ledgerJournalEntry.creditedAccountId,
				timestamp: ledgerJournalEntry.timestamp
			};
			return journalEntryDto; // TODO: return object directly instead?
		});
		return journalEntryDtos;
	}
}
