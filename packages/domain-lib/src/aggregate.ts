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
import {randomUUID} from "crypto";
import {
	AccountAlreadyExistsError,
	SameCreditedAndDebitedAccountsError,
	CurrencyCodesDifferError,
	InsufficientBalanceError,
	InvalidCreditBalanceError,
	InvalidDebitBalanceError, InvalidExternalCategoryError,
	InvalidExternalIdError, InvalidJournalEntryAmountError, InvalidTimestampError,
	JournalEntryAlreadyExistsError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	UnauthorizedError
} from "./types/errors";
import {
	IAccountsRepo,
	IJournalEntriesRepo
} from "./types/infrastructure";
import {Account} from "./types/account";
import {JournalEntry} from "./types/journal_entry";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {Privileges} from "./types/privileges";
import {join} from "path";
import {readFileSync} from "fs";
import {ICurrency} from "./types/currency";
import {bigintToString} from "./utils";

enum AuditingActions {
	ACCOUNT_CREATED = "ACCOUNT_CREATED"
}

export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly authorizationClient: IAuthorizationClient;
	private readonly auditingClient: IAuditClient;
	private readonly accountsRepo: IAccountsRepo;
	private readonly journalEntriesRepo: IJournalEntriesRepo;
	private readonly currencies: ICurrency[];
	// Other properties.
	private static readonly CURRENCIES_FILE_NAME: string = "currencies.json";

	constructor(
		logger: ILogger,
		authorizationClient: IAuthorizationClient,
		auditingClient: IAuditClient,
		accountsRepo: IAccountsRepo,
		journalEntriesRepo: IJournalEntriesRepo
	) {
		this.logger = logger;
		this.authorizationClient = authorizationClient;
		this.auditingClient = auditingClient;
		this.accountsRepo = accountsRepo;
		this.journalEntriesRepo = journalEntriesRepo;

		// TODO: here?
		const currenciesFilePath: string = join(__dirname, Aggregate.CURRENCIES_FILE_NAME);
		try {
			this.currencies = JSON.parse(readFileSync(currenciesFilePath, "utf-8"));
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
	}

	private enforcePrivilege(securityContext: CallSecurityContext, privilegeId: string): void {
		for (const roleId of securityContext.rolesIds) {
			if (this.authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
				return;
			}
		}
		throw new UnauthorizedError(); // TODO: change error name.
	}

	private getAuditSecurityContext(securityContext: CallSecurityContext): AuditSecurityContext {
		return {
			userId: securityContext.username,
			appId: securityContext.clientId,
			role: "" // TODO: get role.
		};
	}

	// TODO: why ignore the case in which randomUUID() generates an already existing id?
	async createAccount(accountDto: IAccountDto, securityContext: CallSecurityContext): Promise<string> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_ACCOUNT);
		const account: Account = Account.FromDto(accountDto, this.currencies);

		// new accounts cannot have a timestampLastJournalEntry already
		account.timestampLastJournalEntry = null;

		if (account.externalId === "") {
			throw new InvalidExternalIdError();
		}
		if (account.creditBalance < 0) {
			throw new InvalidCreditBalanceError();
		}
		if (account.debitBalance < 0) {
			throw new InvalidDebitBalanceError();
		}

		// Store the account.
		try {
			// accountDto can't be stored because the balances might not be formatted.
			await this.accountsRepo.storeNewAccount(Account.ToDto(account));
		} catch (e: unknown) {
			if (!(e instanceof AccountAlreadyExistsError)) {
				this.logger.error(e);
			}
			throw e;
		}
		// TODO: configure; try-catch.
		await this.auditingClient.audit(
			AuditingActions.ACCOUNT_CREATED,
			true,
			this.getAuditSecurityContext(securityContext),
			[{key: "accountId", value: account.id}]
		);
		return account.id;
	}

	async createJournalEntries(
		journalEntryDtos: IJournalEntryDto[],
		securityContext: CallSecurityContext
	): Promise<string[]> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_JOURNAL_ENTRY);
		const idsJournalEntries: string[] = []; // TODO: verify.
		for (const journalEntryDto of journalEntryDtos) {
			idsJournalEntries.push(await this.createJournalEntry(journalEntryDto)); // TODO: verify.
		}
		return idsJournalEntries;
	}

	private async createJournalEntry(journalEntryDto: IJournalEntryDto): Promise<string> {
		const journalEntry: JournalEntry = JournalEntry.FromDto(journalEntryDto, this.currencies);

		// timestamps are controlled by this service, force timestamp to be now
		journalEntryDto.timestamp = Date.now();

		if (journalEntry.externalId === "") {
			throw new InvalidExternalIdError();
		}
		if (journalEntry.externalCategory === "") {
			throw new InvalidExternalCategoryError();
		}
		if (journalEntry.amount < 0) {
			throw new InvalidJournalEntryAmountError();
		}
		// Check if the credited and debited accounts are the same.
		if (journalEntry.creditedAccountId === journalEntry.debitedAccountId) {
			throw new SameCreditedAndDebitedAccountsError(); // TODO: error name.
		}

		// Check if the credited and debited accounts exist.
		// Instead of using the repo's accountExistsById and journalEntryExistsById functions, the accounts are fetched
		// and compared to null; this is done because some of the accounts' properties need to be consulted, so it
		// doesn't make sense to call those functions when the accounts need to be fetched anyway.
		let creditedAccountDto: IAccountDto | null;
		let debitedAccountDto: IAccountDto | null;
		try {
			creditedAccountDto = await this.accountsRepo.getAccountById(journalEntry.creditedAccountId);
			debitedAccountDto = await this.accountsRepo.getAccountById(journalEntry.debitedAccountId);
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
		if (creditedAccountDto === null) {
			throw new NoSuchCreditedAccountError();
		}
		if (debitedAccountDto === null) {
			throw new NoSuchDebitedAccountError();
		}
		let creditedAccount: Account;
		let debitedAccount: Account;
		try {
			creditedAccount = Account.FromDto(creditedAccountDto, this.currencies);
			debitedAccount = Account.FromDto(debitedAccountDto, this.currencies);
		} catch (error: unknown) { // TODO: verify.
			this.logger.error(error);
			throw error;
		}
		// Check if the currency codes of the credited and debited accounts and the journal entry match.
		if (creditedAccount.currencyCode !== debitedAccount.currencyCode
			|| creditedAccount.currencyCode !== journalEntry.currencyCode) {
			throw new CurrencyCodesDifferError();
		}
		// Check if the currency decimals of the credited and debited accounts and the journal entry match.
		if (creditedAccount.currencyDecimals !== debitedAccount.currencyDecimals
			|| creditedAccount.currencyDecimals !== journalEntry.currencyDecimals) {
			this.logger.error("currency decimals differ"); // TODO: makes sense to create a type for the svcs?
			throw new Error();
		}
		// Check if the balance is sufficient.
		if (Account.calculateBalance(debitedAccount) - journalEntry.amount < 0) {
			throw new InsufficientBalanceError();
		}


		// Store the journal entry.
		try {
			// journalEntryDto can't be stored because the amount might not be formatted.
			await this.journalEntriesRepo.storeNewJournalEntry(JournalEntry.ToDto(journalEntry));
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
				bigintToString(creditedAccount.creditBalance + journalEntry.amount, creditedAccount.currencyDecimals),
				journalEntry.timestamp! // timestamp is forced at the beggining of this function
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}
		try {
			await this.accountsRepo.updateAccountDebitBalanceById(
				debitedAccount.id,
				bigintToString(debitedAccount.debitBalance + journalEntry.amount, debitedAccount.currencyDecimals),
				journalEntry.timestamp!
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}
		return journalEntry.id;
	}

	async getAccountById(accountId: string, securityContext: CallSecurityContext): Promise<IAccountDto | null> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_ACCOUNT);
		try {
			const accountDto: IAccountDto | null = await this.accountsRepo.getAccountById(accountId);
			return accountDto;
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}

	async getAccountsByExternalId(externalId: string, securityContext: CallSecurityContext): Promise<IAccountDto[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_ACCOUNT);
		try {
			const accountDtos: IAccountDto[] =
				await this.accountsRepo.getAccountsByExternalId(externalId);
			return accountDtos;
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}

	async getJournalEntriesByAccountId(
		accountId: string,
		securityContext: CallSecurityContext
	): Promise<IJournalEntryDto[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_JOURNAL_ENTRY);
		try {
			const journalEntryDtos: IJournalEntryDto[] =
				await this.journalEntriesRepo.getJournalEntriesByAccountId(accountId);
			return journalEntryDtos;
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}
}
