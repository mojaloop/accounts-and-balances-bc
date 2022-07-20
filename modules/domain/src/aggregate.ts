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
import * as uuid from "uuid";
import {
	AccountAlreadyExistsError,
	CreditedAndDebitedAccountsAreTheSameError,
	CurrenciesDifferError,
	InsufficientBalanceError,
	JournalEntryAlreadyExistsError,
	NoSuchAccountError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	NoSuchJournalEntryError
} from "./errors";
import {IAccountsRepo, IJournalEntriesRepo} from "./infrastructure_interfaces";
import {Account} from "./entities/account";
import {JournalEntry} from "./entities/journal_entry";
import {IAccount, IJournalEntry} from "./types";

// Validate type of strings.

export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly accountsRepo: IAccountsRepo;
	private readonly journalEntriesRepo: IJournalEntriesRepo;
	// Other properties.

	constructor(
		logger: ILogger,
		accountsRepo: IAccountsRepo,
		journalEntriesRepo: IJournalEntriesRepo
	) {
		this.logger = logger;
		this.accountsRepo = accountsRepo;
		this.journalEntriesRepo = journalEntriesRepo;
	}

	// DONE.
	async init(): Promise<void> {
		try {
			await this.accountsRepo.init();
			await this.journalEntriesRepo.init();
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	// DONE.
	async destroy(): Promise<void> {
		await this.accountsRepo.destroy();
		await this.journalEntriesRepo.destroy();
	}

	// TODO: why ignore the case in which uuid.v4() generate an already existing id?
	async createAccount(account: IAccount): Promise<string> {
		// Generate a random UUId, if needed.
		if (account.id === undefined || account.id === null || account.id === "") {
			account.id = uuid.v4();
		}
		Account.validateAccount(account);
		// Store the account.
		try {
			await this.accountsRepo.storeNewAccount(account);
		} catch (e: unknown) {
			if (!(e instanceof AccountAlreadyExistsError)) {
				this.logger.error(e);
			}
			throw e;
		}
		return account.id;
	}

	async createJournalEntries(journalEntries: IJournalEntry[]): Promise<string[]> {
		const idsJournalEntries: string[] = []; // TODO.
		for (const journalEntry of journalEntries) { // TODO: of?
			idsJournalEntries.push(await this.createJournalEntry(journalEntry)); // TODO.
		}
		return idsJournalEntries;
	}

	private async createJournalEntry(journalEntry: IJournalEntry): Promise<string> {
		// Generate a random UUId, if needed.
		if (journalEntry.id === undefined || journalEntry.id === null || journalEntry.id === "") {
			journalEntry.id = uuid.v4();
		}
		JournalEntry.validateJournalEntry(journalEntry);
		// Check if the credited and debited accounts are the same. TODO: required?
		if (journalEntry.creditedAccountId === journalEntry.debitedAccountId) {
			throw new CreditedAndDebitedAccountsAreTheSameError(); // TODO.
		}
		// Check if the credited and debited accounts exist.
		// Instead of using the repo's accountExistsById and journalEntryExistsById functions, the accounts are fetched
		// and compared to null; this is done because some of the accounts' properties need to be consulted, so it
		// doesn't make sense to call those functions when the accounts need to be fetched anyway.
		let creditedAccount: Account | null;
		let debitedAccount: Account | null;
		try {
			creditedAccount = await this.accountsRepo.getAccountById(journalEntry.creditedAccountId);
			debitedAccount = await this.accountsRepo.getAccountById(journalEntry.debitedAccountId);
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
		if (creditedAccount === null) {
			throw new NoSuchCreditedAccountError();
		}
		if (debitedAccount === null) {
			throw new NoSuchDebitedAccountError();
		}
		// Check if the currencies of the credited and debited accounts and the journal entry match.
		if (creditedAccount.currency !== debitedAccount.currency
			|| creditedAccount.currency !== journalEntry.currency) {
			throw new CurrenciesDifferError(); // TODO.
		}
		// Check if the balance is sufficient.
		if (this.calculateAccountBalance(creditedAccount) - journalEntry.amount < 0n) { // TODO.
			throw new InsufficientBalanceError(); // TODO.
		}
		// Store the journal entry.
		try {
			await this.journalEntriesRepo.storeNewJournalEntry(journalEntry);
		} catch (e: unknown) {
			if (!(e instanceof JournalEntryAlreadyExistsError)) {
				this.logger.error(e);
			}
			throw e;
		}
		// Update the accounts' balances and time stamps.
		try {
			await this.accountsRepo.updateAccountCreditBalanceById(
				creditedAccount.id,
				creditedAccount.creditBalance + journalEntry.amount,
				journalEntry.timestamp
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}
		try {
			await this.accountsRepo.updateAccountDebitBalanceById(
				debitedAccount.id,
				debitedAccount.debitBalance + journalEntry.amount,
				journalEntry.timestamp
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}
		return journalEntry.id;
	}

	// DONE.
	async getAccountById(accountId: string): Promise<IAccount | null> {
		try {
			return await this.accountsRepo.getAccountById(accountId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getJournalEntryById(journalEntryId: string): Promise<IJournalEntry | null> {
		try {
			return await this.journalEntriesRepo.getJournalEntryById(journalEntryId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getAllAccounts(): Promise<IAccount[]> {
		try {
			return await this.accountsRepo.getAllAccounts();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getAllJournalEntries(): Promise<IJournalEntry[]> {
		try {
			return await this.journalEntriesRepo.getAllJournalEntries();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getAccountsByExternalId(externalId: string): Promise<IAccount[]> {
		try {
			return await this.accountsRepo.getAccountsByExternalId(externalId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntry[]> {
		try {
			return await this.journalEntriesRepo.getJournalEntriesByAccountId(accountId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async deleteAccountById(accountId: string): Promise<void> {
		try {
			await this.accountsRepo.deleteAccountById(accountId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchAccountError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	// DONE.
	async deleteJournalEntryById(journalEntryId: string): Promise<void> {
		try {
			await this.journalEntriesRepo.deleteJournalEntryById(journalEntryId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchJournalEntryError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	// DONE.
	async deleteAllAccounts(): Promise<void> {
		try {
			await this.accountsRepo.deleteAllAccounts();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async deleteAllJournalEntries(): Promise<void> {
		try {
			await this.journalEntriesRepo.deleteAllJournalEntries();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	private calculateAccountBalance(account: Account): bigint {
		return account.creditBalance - account.debitBalance;
	}
}
