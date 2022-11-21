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
	SameDebitedAndCreditedAccountsError,
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
	InvalidCurrencyDecimalsError, InvalidAccountStateError, InvalidAccountTypeError
} from "packages/ledger-grpc-svc/src/domain/errors";
import {
	IAccountsRepo,
	IJournalEntriesRepo
} from "packages/ledger-grpc-svc/src/domain/infrastructure";
import {Account} from "packages/ledger-grpc-svc/src/domain/account";
import {JournalEntry} from "packages/ledger-grpc-svc/src/domain/journal_entry";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {Privileges} from "packages/ledger-grpc-svc/src/domain/privileges";
import {join} from "path";
import {readFileSync} from "fs";
import {ICurrency} from "packages/ledger-grpc-svc/src/domain/currency";
import {bigintToString, stringToBigint} from "packages/ledger-grpc-svc/src/domain/converters";
import {LedgerAccount} from "@mojaloop/accounts-and-balances-bc-grpc-svc";
import {
	GrpcAccount,
	GrpcAccount__Output, GrpcJournalEntry,
	GrpcJournalEntry__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";

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
		this.logger = logger.createChild(this.constructor.name);
		this.authorizationClient = authorizationClient;
		this.auditingClient = auditingClient;
		this.accountsRepo = accountsRepo;
		this.journalEntriesRepo = journalEntriesRepo;

		// TODO: here?
		const currenciesFileAbsolutePath: string = join(__dirname, Aggregate.CURRENCIES_FILE_NAME);
		try {
			this.currencies = JSON.parse(readFileSync(currenciesFileAbsolutePath, "utf-8"));
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

	// TODO: receive GrpcAccount__Output[]?
	async createAccounts(
		grpcAccountsOutput: GrpcAccount__Output[],
		securityContext: CallSecurityContext
	): Promise<string[]> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_ACCOUNT);

		// When creating an account, currencyDecimals and timestampLastJournalEntry are supposed to be null and
		// debitBalance and creditBalance 0. For consistency purposes and to make sure whoever calls this function
		// knows that, if those values aren't respected, errors are thrown.
		if (accountDto.currencyDecimals !== null) {
			throw new InvalidCurrencyDecimalsError();
		}
		if (accountDto.timestampLastJournalEntry !== null) {
			throw new InvalidTimestampError();
		}
		if (parseInt(accountDto.debitBalance) !== 0) {
			throw new InvalidDebitBalanceError();
		}
		if (parseInt(accountDto.creditBalance) !== 0) {
			throw new InvalidCreditBalanceError();
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

		// Verify the account state and type.
		if (!Object.values(AccountState).includes(accountDto.state)) {
			throw new InvalidAccountStateError();
		}
		if (!Object.values(AccountType).includes(accountDto.type)) {
			throw new InvalidAccountTypeError();
		}

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
		} catch (error: unknown) {
			if (!(error instanceof AccountAlreadyExistsError)) {
				this.logger.error(error);
			}
			throw error;
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

	// TODO: receive GrpcJournalEntry__Output[]?
	async createJournalEntries(
		grpcJournalEntriesOutput: GrpcJournalEntry__Output[],
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
			journalEntryDto.debitedAccountId,
			journalEntryDto.creditedAccountId,
			timestamp
		);

		// Check if the debited and credited accounts are the same.
		if (journalEntry.debitedAccountId === journalEntry.creditedAccountId) {
			throw new SameDebitedAndCreditedAccountsError();
		}

		// Check if the debited and credited accounts exist.
		// Instead of using the repo's accountExistsById and journalEntryExistsById functions, the accounts are fetched
		// and compared to null; this is done because some of the accounts' properties need to be consulted, so it
		// doesn't make sense to call those functions when the accounts need to be fetched anyway.
		let debitedAccountDto: IAccountDto | null;
		let creditedAccountDto: IAccountDto | null;
		try {
			debitedAccountDto = await this.accountsRepo.getAccountById(journalEntry.debitedAccountId);
			creditedAccountDto = await this.accountsRepo.getAccountById(journalEntry.creditedAccountId);
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
		if (debitedAccountDto === null) {
			throw new NoSuchDebitedAccountError();
		}
		if (creditedAccountDto === null) {
			throw new NoSuchCreditedAccountError();
		}
		// null checks to avoid non-null assertions when calling Account().
		if (
			debitedAccountDto.id === null || debitedAccountDto.currencyDecimals === null
			|| creditedAccountDto.id === null || creditedAccountDto.currencyDecimals === null
		) {
			throw new Error(); // TODO: message?
		}
		let debitedAccount: Account;
		let creditedAccount: Account;
		try {
			debitedAccount = new Account(
				debitedAccountDto.id,
				debitedAccountDto.externalId,
				debitedAccountDto.state,
				debitedAccountDto.type,
				debitedAccountDto.currencyCode,
				debitedAccountDto.currencyDecimals,
				stringToBigint(debitedAccountDto.debitBalance, debitedAccountDto.currencyDecimals),
				stringToBigint(debitedAccountDto.creditBalance, debitedAccountDto.currencyDecimals),
				debitedAccountDto.timestampLastJournalEntry
			);
			creditedAccount = new Account(
				creditedAccountDto.id,
				creditedAccountDto.externalId,
				creditedAccountDto.state,
				creditedAccountDto.type,
				creditedAccountDto.currencyCode,
				creditedAccountDto.currencyDecimals,
				stringToBigint(creditedAccountDto.debitBalance, creditedAccountDto.currencyDecimals),
				stringToBigint(creditedAccountDto.creditBalance, creditedAccountDto.currencyDecimals),
				creditedAccountDto.timestampLastJournalEntry
			);
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}

		// Check if the currency codes of the debited and credited accounts and the journal entry match.
		if (debitedAccount.currencyCode !== creditedAccount.currencyCode
			|| debitedAccount.currencyCode !== journalEntry.currencyCode) {
			throw new CurrencyCodesDifferError();
		}

		// Check if the currency decimals of the debited and credited accounts and the journal entry match.
		if (debitedAccount.currencyDecimals !== creditedAccount.currencyDecimals
			|| debitedAccount.currencyDecimals !== journalEntry.currencyDecimals) {
			// TODO: does it make sense to create a custom error to be used on the services?
			this.logger.error("currency decimals differ");
			throw new Error("currency decimals differ");
		}

		// Check if the balance is sufficient.
		if (debitedAccount.calculateBalance() - journalEntry.amount < 0n) {
			throw new InsufficientBalanceError();
		}

		// Store the journal entry (journalEntryDto can't be stored).
		const formattedJournalEntryDto: IJournalEntryDto = journalEntry.toDto();
		try {
			await this.journalEntriesRepo.storeNewJournalEntry(formattedJournalEntryDto);
		} catch (error: unknown) {
			if (!(error instanceof JournalEntryAlreadyExistsError)) {
				this.logger.error(error);
			}
			throw error;
		}

		// null check to avoid non-null assertions when calling the updateAccount functions.
		if (journalEntry.timestamp === null) {
			throw new Error(); // TODO: message?
		}

		// Update the debited account's debit balance and timestamp.
		const updatedDebitBalance: string = bigintToString(
			debitedAccount.debitBalance + journalEntry.amount,
			debitedAccount.currencyDecimals
		);
		try {
			await this.accountsRepo.updateAccountDebitBalanceAndTimestampById(
				debitedAccount.id,
				updatedDebitBalance,
				journalEntry.timestamp
			);
		} catch (error: unknown) {
			// TODO: revert store.
			this.logger.error(error);
			throw error;
		}

		// Update the credited account's credit balance and timestamp.
		const updatedCreditBalance: string = bigintToString(
			creditedAccount.creditBalance + journalEntry.amount,
			creditedAccount.currencyDecimals
		);
		try {
			await this.accountsRepo.updateAccountCreditBalanceAndTimestampById(
				creditedAccount.id,
				updatedCreditBalance,
				journalEntry.timestamp
			);
		} catch (error: unknown) {
			// TODO: revert store and update.
			this.logger.error(error);
			throw error;
		}

		return journalEntry.id;
	}

	// TODO: receive string[] and return GrpcAccount[]?
	async getAccountsByIds(accountIds: string[], securityContext: CallSecurityContext): Promise<GrpcAccount[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_ACCOUNT);

		try {
			const grpcAccounts: GrpcAccount[] = await this.accountsRepo.getAccountsByIds(accountIds);
			return grpcAccounts;
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
	}

	// TODO: receive string[] and return GrpcJournalEntry[]?
	async getJournalEntriesByAccountId(
		accountId: string,
		securityContext: CallSecurityContext
	): Promise<GrpcJournalEntry[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_JOURNAL_ENTRY);

		try {
			const grpcJournalEntries: GrpcJournalEntry[] =
				await this.journalEntriesRepo.getJournalEntriesByAccountId(accountId);
			return grpcJournalEntries;
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
	}
}
