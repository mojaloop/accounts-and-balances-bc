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
	InvalidExternalCategoryError,
	InvalidExternalIdError,
	InvalidJournalEntryAmountError,
	InvalidTimestampError,
	JournalEntryAlreadyExistsError,
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	UnauthorizedError,
	InvalidIdError,
	InvalidCurrencyCodeError,
	InvalidCreditBalanceError,
	InvalidDebitBalanceError,
	InvalidCurrencyDecimalsError
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
import {bigintToString, stringToBigint} from "./converters";

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

	async createAccount(accountDto: IAccountDto, securityContext: CallSecurityContext): Promise<string> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_ACCOUNT);

		// When creating an account, currencyDecimals and timestampLastJournalEntry are supposed to be null and
		// creditBalance and debitBalance 0. For consistency purposes and to make sure whoever calls this function
		// knows that, if those values aren't respected, errors are thrown.
		if (accountDto.currencyDecimals !== null) {
			throw new InvalidCurrencyDecimalsError();
		}
		if (accountDto.timestampLastJournalEntry !== null) {
			throw new InvalidTimestampError();
		}
		if (parseInt(accountDto.creditBalance) !== 0) {
			throw new InvalidCreditBalanceError();
		}
		if (parseInt(accountDto.debitBalance) !== 0) {
			throw new InvalidDebitBalanceError();
		}

		// When creating an account, id and externalId are supposed to be either a non-empty string or null. For
		// consistency purposes and to make sure whoever calls this function knows that, if those values aren't
		// respected, errors are thrown.
		if (accountDto.id === "") {
			throw new InvalidIdError();
		}
		if (accountDto.externalId === "") {
			throw new InvalidExternalIdError();
		}

		// Generate a random UUId, if needed. TODO: randomUUID() can generate an id that already exists.
		const accountId: string = accountDto.id ?? randomUUID();

		// Verify the currency code (and get the corresponding currency decimals).
		const currency: ICurrency | undefined = this.currencies.find(currency => {
			return currency.code === accountDto.currencyCode;
		});
		if (currency === undefined) {
			throw new InvalidCurrencyCodeError();
		}

		const account: Account = new Account(
			accountId,
			accountDto.externalId,
			accountDto.state,
			accountDto.type,
			accountDto.currencyCode,
			currency.decimals,
			0n,
			0n,
			null
		);

		// Store the account (accountDto can't be stored).
		const formattedAccountDto: IAccountDto = account.toDto();
		try {
			await this.accountsRepo.storeNewAccount(formattedAccountDto);
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
			const journalEntryId: string = await this.createJournalEntry(journalEntryDto);
			idsJournalEntries.push(journalEntryId); // TODO: verify.
		}

		return idsJournalEntries;
	}

	private async createJournalEntry(journalEntryDto: IJournalEntryDto): Promise<string> {
		// When creating a journal entry, currencyDecimals and timestamp are supposed to be null. For consistency
		// purposes and to make sure whoever calls this function knows that, if those values aren't respected, errors
		// are thrown.
		if (journalEntryDto.currencyDecimals !== null) {
			throw new InvalidCurrencyDecimalsError();
		}
		if (journalEntryDto.timestamp !== null) {
			throw new InvalidTimestampError();
		}

		// When creating a journal entry, id, externalId and externalCategory are supposed to be either a non-empty
		// string or null. For consistency purposes and to make sure whoever calls this function knows that, if those
		// values aren't respected, errors are thrown.
		if (journalEntryDto.id === "") {
			throw new InvalidIdError();
		}
		if (journalEntryDto.externalId === "") {
			throw new InvalidExternalIdError();
		}
		if (journalEntryDto.externalCategory === "") {
			throw new InvalidExternalCategoryError();
		}

		// Generate a random UUId, if needed. TODO: randomUUID() can generate an id that already exists.
		const journalEntryId: string = journalEntryDto.id ?? randomUUID();

		// Verify the currency code (and get the corresponding currency decimals).
		const currency: ICurrency | undefined = this.currencies.find(currency => {
			return currency.code === journalEntryDto.currencyCode;
		});
		if (currency === undefined) {
			throw new InvalidCurrencyCodeError();
		}

		// Convert the amount and check if it's valid.
		let amount: bigint;
		try {
			amount = stringToBigint(journalEntryDto.amount, currency.decimals);
		} catch (error: unknown) {
			throw new InvalidJournalEntryAmountError();
		}
		if (amount <= 0n) {
			throw new InvalidJournalEntryAmountError();
		}

		// Get a timestamp.
		const timestamp: number = Date.now();

		const journalEntry: JournalEntry = new JournalEntry(
			journalEntryId,
			journalEntryDto.externalId,
			journalEntryDto.externalCategory,
			journalEntryDto.currencyCode,
			currency.decimals,
			amount,
			journalEntryDto.creditedAccountId,
			journalEntryDto.debitedAccountId,
			timestamp
		);

		// Check if the credited and debited accounts are the same.
		if (journalEntry.creditedAccountId === journalEntry.debitedAccountId) {
			throw new SameCreditedAndDebitedAccountsError();
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
			creditedAccount = new Account(
				creditedAccountDto.id!,
				creditedAccountDto.externalId,
				creditedAccountDto.state,
				creditedAccountDto.type,
				creditedAccountDto.currencyCode,
				creditedAccountDto.currencyDecimals!,
				stringToBigint(creditedAccountDto.creditBalance, creditedAccountDto.currencyDecimals!),
				stringToBigint(creditedAccountDto.debitBalance, creditedAccountDto.currencyDecimals!),
				creditedAccountDto.timestampLastJournalEntry
			);
			debitedAccount = new Account(
				debitedAccountDto.id!,
				debitedAccountDto.externalId,
				debitedAccountDto.state,
				debitedAccountDto.type,
				debitedAccountDto.currencyCode,
				debitedAccountDto.currencyDecimals!,
				stringToBigint(debitedAccountDto.creditBalance, debitedAccountDto.currencyDecimals!),
				stringToBigint(debitedAccountDto.debitBalance, debitedAccountDto.currencyDecimals!),
				debitedAccountDto.timestampLastJournalEntry
			);
		} catch (error: unknown) {
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
			// TODO: does it make sense to create a custom error to be used on the services?
			this.logger.error("currency decimals differ");
			throw new Error();
		}

		// Check if the balance is sufficient.
		if (debitedAccount.calculateBalance() - journalEntry.amount < 0n) {
			throw new InsufficientBalanceError();
		}

		// Store the journal entry (journalEntryDto can't be stored).
		const formattedJournalEntryDto: IJournalEntryDto = journalEntry.toDto();
		try {
			await this.journalEntriesRepo.storeNewJournalEntry(formattedJournalEntryDto);
		} catch (e: unknown) {
			if (!(e instanceof JournalEntryAlreadyExistsError)) {
				this.logger.error(e);
			}
			throw e;
		}

		// Update the credited account's credit balance and timestamp.
		const updatedCreditBalance: string = bigintToString(
			creditedAccount.creditBalance + journalEntry.amount,
			creditedAccount.currencyDecimals
		);
		try {
			await this.accountsRepo.updateAccountCreditBalanceById(
				creditedAccount.id,
				updatedCreditBalance,
				journalEntry.timestamp!
			);
		} catch (e: unknown) {
			// TODO: revert store.
			this.logger.error(e);
			throw e;
		}

		// Update the debited account's debit balance and timestamp.
		const updatedDebitBalance: string = bigintToString(
			debitedAccount.debitBalance + journalEntry.amount,
			debitedAccount.currencyDecimals
		);
		try {
			await this.accountsRepo.updateAccountDebitBalanceById(
				debitedAccount.id,
				updatedDebitBalance,
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
