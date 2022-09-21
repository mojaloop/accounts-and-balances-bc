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
	NoSuchCreditedAccountError,
	NoSuchDebitedAccountError,
	UnauthorizedError
} from "./errors";
import {IAccountsRepo, IJournalEntriesRepo} from "./infrastructure_interfaces";
import {Account} from "./entities/account";
import {JournalEntry} from "./entities/journal_entry";
import {IAccount, IJournalEntry} from "./types";
import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient} from "@mojaloop/security-bc-public-types-lib";
import {Privileges} from "./privileges";

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
	}

	// TODO: solve!!!!!!!!!!
	private enforcePrivilege(securityContext: CallSecurityContext, privilegeId: string): void {
		/*for (const roleId of securityContext.rolesIds) {
			if (this.authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
				return;
			}
		}
		throw new UnauthorizedError(); // TODO: change error name.*/
	}

	private getAuditSecurityContext(securityContext: CallSecurityContext): AuditSecurityContext {
		return {
			userId: securityContext.username,
			appId: securityContext.clientId,
			role: "" // TODO: get role.
		};
	}

	// TODO: why ignore the case in which uuid.v4() generates an already existing id?
	async createAccount(account: IAccount, securityContext: CallSecurityContext): Promise<string> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_ACCOUNT);
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
		// TODO: configure; try-catch.
		await this.auditingClient.audit(
			AuditingActions.ACCOUNT_CREATED,
			true,
			this.getAuditSecurityContext(securityContext),
			[{key: "accountId", value: account.id}]
		);
		return account.id;
	}

	async createJournalEntries(journalEntries: IJournalEntry[], securityContext: CallSecurityContext): Promise<string[]> {
		this.enforcePrivilege(securityContext, Privileges.CREATE_JOURNAL_ENTRY);
		const idsJournalEntries: string[] = []; // TODO: verify.
		for (const journalEntry of journalEntries) {
			idsJournalEntries.push(await this.createJournalEntry(journalEntry)); // TODO: verify.
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
			throw new CreditedAndDebitedAccountsAreTheSameError(); // TODO: error name.
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
			throw new CurrenciesDifferError(); // TODO: error name.
		}
		// Check if the balance is sufficient.
		if (this.calculateAccountBalance(creditedAccount) - journalEntry.amount < 0n) { // TODO: verify.
			throw new InsufficientBalanceError(); // TODO: error name.
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

	async getAccountById(accountId: string, securityContext: CallSecurityContext): Promise<IAccount | null> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_ACCOUNT);
		try {
			return await this.accountsRepo.getAccountById(accountId);
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}

	async getAccountsByExternalId(externalId: string, securityContext: CallSecurityContext): Promise<IAccount[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_ACCOUNT);
		try {
			return await this.accountsRepo.getAccountsByExternalId(externalId);
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}

	async getJournalEntriesByAccountId(
		accountId: string,
		securityContext: CallSecurityContext)
	: Promise<IJournalEntry[]> {
		this.enforcePrivilege(securityContext, Privileges.VIEW_JOURNAL_ENTRY);
		try {
			return await this.journalEntriesRepo.getJournalEntriesByAccountId(accountId);
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}
	}

	private calculateAccountBalance(account: Account): bigint {
		return account.creditBalance - account.debitBalance;
	}
}
