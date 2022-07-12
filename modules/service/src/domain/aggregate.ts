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
	InsufficientBalanceError, InvalidAccountError,
	InvalidAccountIdTypeError,
	InvalidExternalIdTypeError, InvalidJournalEntryError,
	InvalidJournalEntryIdTypeError,
	JournalEntryAlreadyExistsError,
	NoSuchAccountError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	NoSuchJournalEntryError,
	NotAnArrayError
} from "./errors";
import {IRepo} from "./infrastructure-interfaces/irepo";
import {Account, JournalEntry} from "./types";
import {type} from "os";

export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly repo: IRepo;
	// Other properties.

	constructor(
		logger: ILogger,
		repo: IRepo
	) {
		this.logger = logger;
		this.repo = repo;
	}

	// DONE.
	async init(): Promise<void> {
		try {
			await this.repo.init();
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	// DONE.
	async destroy(): Promise<void> {
		await this.repo.destroy();
	}

	async createAccount(account: any): Promise<string> { // TODO: any?
		if (typeof account !== "object" || account === null) {
			throw new InvalidAccountError(); // TODO.
		}
		// To facilitate the creation of accounts, undefined/null ids are accepted and converted to empty strings,
		// so that random UUIds are generated when storing the accounts. TODO.
		if (account.id === undefined || account.id === null) {
			account.id = "";
		}
		Account.validateAccount(account);
		// Generate a random UUId, if needed, and store the account.
		// TODO.
		let randomIdGenerated: boolean = false;
		try {
			if (account.id === "") {
				account.id = uuid.v4();
				randomIdGenerated = true;
			}
			await this.repo.storeAccount(account);
		} catch (e: unknown) {
			if (e instanceof AccountAlreadyExistsError) {
				if (randomIdGenerated) { // Generate a new random id.
					try {
						do {
							account.id = uuid.v4();
						} while (await this.repo.accountExistsById(account.id));
						await this.repo.storeAccount(account);
					} catch (e: unknown) {
						this.logger.error(e);
						throw e;
					}
					return account.id;
				}
				throw new AccountAlreadyExistsError();
			}
			this.logger.error(e);
			throw e;
		}
		return account.id;
	}

	async createJournalEntries(journalEntries: unknown): Promise<string[]> { // TODO: unknown?
		if (!Array.isArray(journalEntries)) { // TODO.
			throw new NotAnArrayError(); // TODO.
		}
		const idsJournalEntries: string[] = []; // TODO.
		for (const journalEntry of journalEntries) { // TODO: of?
			idsJournalEntries.push(await this.createJournalEntry(journalEntry)); // TODO.
		}
		return idsJournalEntries;
	}

	// TODO: shouldn't some of these validations be done outside of this bounded context?
	private async createJournalEntry(journalEntry: any): Promise<string> { // TODO: any?
		if (typeof journalEntry !== "object" || journalEntry === null) {
			throw new InvalidJournalEntryError(); // TODO.
		}
		// To facilitate the creation of journal entries, undefined/null ids are accepted and converted to empty
		// strings, so that random UUIds are generated when storing the journal entries. TODO.
		if (journalEntry.id === undefined || journalEntry.id === null) {
			journalEntry.id = "";
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
		let creditedAccount: Account | null; // TODO: Account or IAccount?
		let debitedAccount: Account | null; // TODO: Account or IAccount?
		try {
			creditedAccount = await this.repo.getAccountById(journalEntry.creditedAccountId);
			if (creditedAccount === null) {
				throw new NoSuchCreditedAccountError(); // TODO: throw inside try?
			}
			debitedAccount = await this.repo.getAccountById(journalEntry.debitedAccountId);
			if (debitedAccount === null) {
				throw new NoSuchDebitedAccountError(); // TODO: throw inside try?
			}
		} catch (e: unknown) {
			if (!(e instanceof NoSuchCreditedAccountError)
				&& !(e instanceof NoSuchDebitedAccountError)) {
				this.logger.error(e);
			}
			throw e;
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
		// Generate a random UUId, if needed, and store the journal entry.
		// TODO.
		let randomIdGenerated: boolean = false;
		try {
			if (journalEntry.id === "") {
				journalEntry.id = uuid.v4();
				randomIdGenerated = true;
			}
			await this.repo.storeJournalEntry(journalEntry);
		} catch (e: unknown) {
			if (e instanceof JournalEntryAlreadyExistsError) {
				if (randomIdGenerated) { // Generate a new random id.
					try {
						do {
							journalEntry.id = uuid.v4();
						} while (await this.repo.journalEntryExistsById(journalEntry.id));
						await this.repo.storeJournalEntry(journalEntry);
					} catch (e: unknown) {
						this.logger.error(e);
						throw e;
					}
				} else { // TODO: else?
					throw new JournalEntryAlreadyExistsError();
				}
			} else { // TODO: else?
				this.logger.error(e);
				throw e;
			}
		}
		// Update the accounts' balances and time stamps.
		try {
			await this.repo.updateAccountCreditBalanceById(
				creditedAccount.id,
				creditedAccount.creditBalance + journalEntry.amount,
				journalEntry.timeStamp
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}
		try {
			await this.repo.updateAccountDebitBalanceById(
				debitedAccount.id,
				debitedAccount.debitBalance + journalEntry.amount,
				journalEntry.timeStamp
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}
		return journalEntry.id;
	}

	// DONE.
	async getAccountById(accountId: unknown): Promise<Account | null> { // TODO: unknown? Account or IAccount?
		if (typeof accountId !== "string") { // TODO.
			throw new InvalidAccountIdTypeError();
		}
		try {
			return await this.repo.getAccountById(accountId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchAccountError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	// DONE.
	async getJournalEntryById(journalEntryId: unknown): Promise<JournalEntry | null> { // TODO: unknown? JournalEntry or IJournalEntry?
		if (typeof journalEntryId !== "string") { // TODO.
			throw new InvalidJournalEntryIdTypeError();
		}
		try {
			return await this.repo.getJournalEntryById(journalEntryId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchJournalEntryError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	// DONE.
	async getAllAccounts(): Promise<Account[]> { // TODO: Account or IAccount?
		try {
			return await this.repo.getAllAccounts();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getAllJournalEntries(): Promise<JournalEntry[]> { // TODO: JournalEntry or IJournalEntry?
		try {
			return await this.repo.getAllJournalEntries();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getAccountsByExternalId(externalId: unknown): Promise<Account[]> { // TODO: unknown? Account or IAccount?
		if (typeof externalId !== "string") { // TODO.
			throw new InvalidExternalIdTypeError();
		}
		try {
			return await this.repo.getAccountsByExternalId(externalId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async getJournalEntriesByAccountId(accountId: unknown): Promise<JournalEntry[]> { // TODO: unknown? JournalEntry or IJournalEntry?
		if (typeof accountId !== "string") { // TODO.
			throw new InvalidAccountIdTypeError();
		}
		try {
			return await this.repo.getJournalEntriesByAccountId(accountId);
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async deleteAccountById(accountId: unknown): Promise<void> { // TODO: unknown?
		if (typeof accountId !== "string") { // TODO.
			throw new InvalidAccountIdTypeError();
		}
		try {
			await this.repo.deleteAccountById(accountId);
		} catch (e: unknown) { // TODO.
			if (!(e instanceof NoSuchAccountError)) {
				this.logger.error(e);
			}
			throw e;
		}
	}

	// DONE.
	async deleteJournalEntryById(journalEntryId: unknown): Promise<void> { // TODO: unknown?
		if (typeof journalEntryId !== "string") { // TODO.
			throw new InvalidJournalEntryIdTypeError();
		}
		try {
			await this.repo.deleteJournalEntryById(journalEntryId);
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
			await this.repo.deleteAllAccounts();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	async deleteAllJournalEntries(): Promise<void> {
		try {
			await this.repo.deleteAllJournalEntries();
		} catch (e: unknown) { // TODO.
			this.logger.error(e);
			throw e;
		}
	}

	// DONE.
	private calculateAccountBalance(account: Account): bigint { // TODO: Account or IAccount?
		return account.creditBalance - account.debitBalance;
	}
}
