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
	InvalidJournalEntryAmountError,
	InvalidTimestampError,
	JournalEntryAlreadyExistsError,
	CreditedAccountNotFoundError,
	DebitedAccountNotFoundError,
	UnauthorizedError,
	InvalidIdError,
	InvalidCurrencyCodeError,
	InvalidCreditBalanceError,
	InvalidDebitBalanceError,
} from "./errors";
import {AccountState, AccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {Privileges} from "./privileges";
import {join} from "path";
import {readFileSync} from "fs";
import {bigintToString, stringToBigint} from "./converters";
import {
	BuiltinLedgerAccount,
	BuiltinLedgerAccountDto,
	BuiltinLedgerJournalEntry,
	BuiltinLedgerJournalEntryDto
} from "./entities";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "./infrastructure";

enum AuditingActions {
	ACCOUNT_CREATED = "ACCOUNT_CREATED"
}

export class BuiltinLedgerAggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly authorizationClient: IAuthorizationClient;
	private readonly auditingClient: IAuditClient;
	private readonly builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private readonly builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
	private readonly currencies: {code: string, decimals: number}[];
	// Other properties.
	private static readonly CURRENCIES_FILE_NAME: string = "currencies.json";

	constructor(
		logger: ILogger,
		authorizationClient: IAuthorizationClient,
		auditingClient: IAuditClient,
		accountsRepo: IBuiltinLedgerAccountsRepo,
		journalEntriesRepo: IBuiltinLedgerJournalEntriesRepo
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.authorizationClient = authorizationClient;
		this.auditingClient = auditingClient;
		this.builtinLedgerAccountsRepo = accountsRepo;
		this.builtinLedgerJournalEntriesRepo = journalEntriesRepo;

		// TODO: here?
		const currenciesFileAbsolutePath: string = join(__dirname, BuiltinLedgerAggregate.CURRENCIES_FILE_NAME);
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

	async createAccounts(
		builtinLedgerAccountDtos: BuiltinLedgerAccountDto[],
		securityContext: CallSecurityContext
	): Promise<string[]> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_JOURNAL_ENTRY);

		const accountIds: string[] = [];
		for (const builtinLedgerAccountDto of builtinLedgerAccountDtos) {
			const accountId: string = await this.createAccount(builtinLedgerAccountDto);
			accountIds.push(accountId);
		}
		return accountIds;
	}

	async createAccount(builtinLedgerAccountDto: BuiltinLedgerAccountDto): Promise<string> {
		// When creating an account, debitBalance, creditBalance and timestampLastJournalEntry are supposed to be null.
		// For consistency purposes, and to make sure whoever calls this function knows that, if those values aren't
		// respected, errors are thrown.
		if (builtinLedgerAccountDto.debitBalance) { // TODO: use "!== null" instead?
			throw new InvalidDebitBalanceError();
		}
		if (builtinLedgerAccountDto.creditBalance) { // TODO: use "!== null" instead?
			throw new InvalidCreditBalanceError();
		}
		if (builtinLedgerAccountDto.timestampLastJournalEntry) { // TODO: use "!== null" instead?
			throw new InvalidTimestampError();
		}

		if (builtinLedgerAccountDto.id === "") {
			throw new InvalidIdError();
		}
		// Generate a random UUId, if needed. TODO: randomUUID() can generate an id that already exists.
		const accountId: string = builtinLedgerAccountDto.id ?? randomUUID(); // TODO: should this be done? ?? or ||?

		// Validate the account's state and type. TODO: how to do this?
		/*if (!Object.values(AccountState).includes(builtinLedgerAccountDto.state)) {
			throw new InvalidAccountStateError();
		}
		if (!Object.values(AccountType).includes(builtinLedgerAccountDto.type)) {
			throw new InvalidAccountTypeError();
		}*/

		// Validate the currency code. TODO: ignore the currency decimals?
		const currency: {code: string, decimals: number} | undefined
			= this.currencies.find((currency) => {
			return currency.code === builtinLedgerAccountDto.currencyCode;
		});
		if (!currency) {
			throw new InvalidCurrencyCodeError();
		}

		const builtinLedgerAccount: BuiltinLedgerAccount = {
			id: accountId,
			state: builtinLedgerAccountDto.state,
			type: builtinLedgerAccountDto.type,
			currencyCode: builtinLedgerAccountDto.currencyCode,
			currencyDecimals: currency.decimals,
			debitBalance: 0n, // TODO: should this start out as 0 or null?
			creditBalance: 0n, // TODO: should this start out as 0 or null?
			timestampLastJournalEntry: null
		};

		// Store the account.
		try {
			await this.builtinLedgerAccountsRepo.storeNewAccount(builtinLedgerAccount);
		} catch (error: unknown) {
			if (!(error instanceof AccountAlreadyExistsError)) {
				this.logger.error(error);
			}
			throw error;
		}

		// TODO: should this be here? are these the right values to use? wrap in try-catch block.
		/*await this.auditingClient.audit(
			AuditingActions.ACCOUNT_CREATED,
			true,
			this.getAuditSecurityContext(securityContext),
			[{key: "accountId", value: account.id}]
		);*/

		return builtinLedgerAccount.id;
	}

	async createJournalEntries(
		builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[],
		securityContext: CallSecurityContext
	): Promise<string[]> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_JOURNAL_ENTRY);

		const journalEntryIds: string[] = [];
		for (const builtinLedgerJournalEntryDto of builtinLedgerJournalEntryDtos) {
			const journalEntryId: string = await this.createJournalEntry(builtinLedgerJournalEntryDto);
			journalEntryIds.push(journalEntryId);
		}
		return journalEntryIds;
	}

	// TODO: does the balance depend on the type of account?
	private calculateAccountBalance(builtinLedgerAccount: BuiltinLedgerAccount): bigint {
		const balance: bigint = builtinLedgerAccount.creditBalance - builtinLedgerAccount.debitBalance;
		return balance;
	}

	private async createJournalEntry(builtinLedgerJournalEntryDto: BuiltinLedgerJournalEntryDto): Promise<string> {
		// When creating a journal entry, timestamp is supposed to be null. For consistency purposes, and to make sure
		// whoever calls this function knows that, if those values aren't respected, errors are thrown.
		if (builtinLedgerJournalEntryDto.timestamp) { // TODO: use "!== null" instead?
			throw new InvalidTimestampError();
		}

		if (builtinLedgerJournalEntryDto.id === "") {
			throw new InvalidIdError();
		}
		// Generate a random UUId, if needed. TODO: randomUUID() can generate an id that already exists.
		const journalEntryId: string = builtinLedgerJournalEntryDto.id ?? randomUUID(); // TODO: should this be done? ?? or ||?

		// Validate the currency code. TODO: ignore the currency decimals?
		const currency: {code: string, decimals: number} | undefined
			= this.currencies.find((currency) => {
			return currency.code === builtinLedgerJournalEntryDto.currencyCode;
		});
		if (!currency) {
			throw new InvalidCurrencyCodeError();
		}

		// Convert the amount to bigint and validate it.
		let amount: bigint;
		try {
			amount = stringToBigint(builtinLedgerJournalEntryDto.amount, currency.decimals);
		} catch (error: unknown) {
			throw new InvalidJournalEntryAmountError();
		}
		if (amount <= 0n) {
			throw new InvalidJournalEntryAmountError();
		}

		// Get a timestamp.
		const timestamp: number = Date.now();

		const builtinLedgerJournalEntry: BuiltinLedgerJournalEntry = {
			id: journalEntryId,
			ownerId: builtinLedgerJournalEntryDto.ownerId,
			currencyCode: builtinLedgerJournalEntryDto.currencyCode,
			currencyDecimals: currency.decimals,
			amount: amount,
			debitedAccountId: builtinLedgerJournalEntryDto.debitedAccountId,
			creditedAccountId: builtinLedgerJournalEntryDto.creditedAccountId,
			timestamp: timestamp
		};

		// Check if the debited and credited accounts are the same.
		if (builtinLedgerJournalEntry.debitedAccountId === builtinLedgerJournalEntry.creditedAccountId) {
			throw new SameDebitedAndCreditedAccountsError();
		}

		// Check if the debited account exists. The account is fetched because some of its properties need to be
		// consulted.
		let debitedBuiltinLedgerAccount: BuiltinLedgerAccount | undefined;
		try {
			debitedBuiltinLedgerAccount = (await this.builtinLedgerAccountsRepo.getAccountsByIds(
				[builtinLedgerJournalEntry.debitedAccountId]
			))[0]; // TODO: should this be done?
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
		if (!debitedBuiltinLedgerAccount) {
			throw new DebitedAccountNotFoundError();
		}

		// Check if the credited account exists. The account is fetched because some of its properties need to be
		// consulted.
		let creditedBuiltinLedgerAccount: BuiltinLedgerAccount | undefined;
		try {
			creditedBuiltinLedgerAccount = (await this.builtinLedgerAccountsRepo.getAccountsByIds(
				[builtinLedgerJournalEntry.creditedAccountId]
			))[0]; // TODO: should this be done?
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}
		if (!creditedBuiltinLedgerAccount) {
			throw new CreditedAccountNotFoundError();
		}

		// Check if the currency codes of the debited and credited accounts and the journal entry match.
		if (debitedBuiltinLedgerAccount.currencyCode !== creditedBuiltinLedgerAccount.currencyCode
			|| debitedBuiltinLedgerAccount.currencyCode !== builtinLedgerJournalEntry.currencyCode) {
			throw new CurrencyCodesDifferError();
		}

		// Check if the currency decimals of the debited and credited accounts and the journal entry match.
		if (debitedBuiltinLedgerAccount.currencyDecimals !== creditedBuiltinLedgerAccount.currencyDecimals
			|| debitedBuiltinLedgerAccount.currencyDecimals !== builtinLedgerJournalEntry.currencyDecimals) {
			// TODO: does it make sense to create a custom error?
			this.logger.error("currency decimals differ");
			throw new Error("currency decimals differ");
		}

		// Check if the balance is sufficient.
		const balanceDebitedAccount: bigint = this.calculateAccountBalance(debitedBuiltinLedgerAccount);
		if (balanceDebitedAccount - builtinLedgerJournalEntry.amount < 0n) {
			throw new InsufficientBalanceError();
		}

		// Store the journal entry.
		try {
			await this.builtinLedgerJournalEntriesRepo.storeNewJournalEntry(builtinLedgerJournalEntry);
		} catch (error: unknown) {
			if (!(error instanceof JournalEntryAlreadyExistsError)) {
				this.logger.error(error);
			}
			throw error;
		}

		// Update the debited account's debit balance and timestamp.
		const updatedDebitBalance: bigint = debitedBuiltinLedgerAccount.debitBalance + builtinLedgerJournalEntry.amount;
		try {
			await this.builtinLedgerAccountsRepo.updateAccountDebitBalanceAndTimestampById(
				builtinLedgerJournalEntry.debitedAccountId,
				updatedDebitBalance,
				builtinLedgerJournalEntry.currencyDecimals,
				builtinLedgerJournalEntry.timestamp
			);
		} catch (error: unknown) {
			// TODO: revert store.
			this.logger.error(error);
			throw error;
		}

		// Update the credited account's credit balance and timestamp.
		const updatedCreditBalance: bigint
			= creditedBuiltinLedgerAccount.creditBalance + builtinLedgerJournalEntry.amount;
		try {
			await this.builtinLedgerAccountsRepo.updateAccountCreditBalanceAndTimestampById(
				builtinLedgerJournalEntry.debitedAccountId,
				updatedCreditBalance,
				builtinLedgerJournalEntry.currencyDecimals,
				builtinLedgerJournalEntry.timestamp
			);
		} catch (error: unknown) {
			// TODO: revert store and update.
			this.logger.error(error);
			throw error;
		}

		// TODO: should this be here? are these the right values to use? wrap in try-catch block.
		/*await this.auditingClient.audit(
			AuditingActions.JOURNAL_ENTRY_CREATED,
			true,
			this.getAuditSecurityContext(securityContext),
			[{key: "accountId", value: account.id}]
		);*/

		return builtinLedgerJournalEntry.id;
	}

	// TODO: audit?
	async getAccountsByIds(
		accountIds: string[],
		securityContext: CallSecurityContext
	): Promise<BuiltinLedgerAccountDto[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_ACCOUNT);

		let builtinLedgerAccounts: BuiltinLedgerAccount[];
		try {
			builtinLedgerAccounts = await this.builtinLedgerAccountsRepo.getAccountsByIds(accountIds);
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}

		const builtinLedgerAccountDtos: BuiltinLedgerAccountDto[]
			= builtinLedgerAccounts.map((builtinLedgerAccount) => {
			const builtinLedgerAccountDto: BuiltinLedgerAccountDto = {
				id: builtinLedgerAccount.id,
				state: builtinLedgerAccount.state,
				type: builtinLedgerAccount.type,
				currencyCode: builtinLedgerAccount.currencyCode,
				debitBalance: bigintToString(builtinLedgerAccount.debitBalance, builtinLedgerAccount.currencyDecimals), // TODO: create an auxiliary variable?
				creditBalance: bigintToString(builtinLedgerAccount.creditBalance, builtinLedgerAccount.currencyDecimals), // TODO: create an auxiliary variable?
				timestampLastJournalEntry: builtinLedgerAccount.timestampLastJournalEntry
			};
			return builtinLedgerAccountDto;
		});
		return builtinLedgerAccountDtos;
	}

	// TODO: audit?
	async getJournalEntriesByAccountId(
		accountId: string,
		securityContext: CallSecurityContext
	): Promise<BuiltinLedgerJournalEntryDto[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_JOURNAL_ENTRY);

		let builtinLedgerJournalEntries: BuiltinLedgerJournalEntry[];
		try {
			builtinLedgerJournalEntries
				= await this.builtinLedgerJournalEntriesRepo.getJournalEntriesByAccountId(accountId);
		} catch (error: unknown) {
			this.logger.error(error);
			throw error;
		}

		const builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[]
			= builtinLedgerJournalEntries.map((builtinLedgerJournalEntry) => {
			const builtinLedgerJournalEntryDto: BuiltinLedgerJournalEntryDto = {
				id: builtinLedgerJournalEntry.id,
				ownerId: builtinLedgerJournalEntry.ownerId,
				currencyCode: builtinLedgerJournalEntry.currencyCode,
				amount: bigintToString(builtinLedgerJournalEntry.amount, builtinLedgerJournalEntry.currencyDecimals), // TODO: create an auxiliary variable?
				debitedAccountId: builtinLedgerJournalEntry.debitedAccountId,
				creditedAccountId: builtinLedgerJournalEntry.creditedAccountId,
				timestamp: builtinLedgerJournalEntry.timestamp
			};
			return builtinLedgerJournalEntryDto;
		});
		return builtinLedgerJournalEntryDtos;
	}
}
