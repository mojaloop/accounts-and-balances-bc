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


import {AuditSecurityContext, IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient, UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {ForbiddenError} from "@mojaloop/security-bc-public-types-lib/dist/index";
import {ChartOfAccountsPrivilegeNames} from "../domain/privilege_names";
import {
	ILedgerAdapter,
	LedgerAdapterAccount,
	LedgerAdapterJournalEntry,
	LedgerAdapterRequestId
} from "./infrastructure-types/ledger_adapter";
import {CoaAccount} from "./coa_account";

import {
	AccountAlreadyExistsError,
	AccountNotFoundError, AccountsAndBalancesError,
	AccountsAndBalancesAccount,
	AcountsAndBalancesJournalEntry,
	CurrencyCodeNotFoundError, InvalidAccountParametersError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";
import {join} from "path";
import {readFileSync} from "fs";
import {bigintToString, stringToBigint} from "./converters";
import { IChartOfAccountsRepo } from "./infrastructure-types/chart_of_accounts_repo";

const CURRENCIES_FILE_NAME = "currencies.json";

export class AccountsAndBalancesAggregate {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _chartOfAccountsRepo: IChartOfAccountsRepo;
	private readonly _ledgerAdapter: ILedgerAdapter;
	private readonly _authorizationClient: IAuthorizationClient;
	private readonly _auditingClient: IAuditClient;
	private readonly _currencies: {code: string, decimals: number}[];

	constructor(
		logger: ILogger,
		authorizationClient: IAuthorizationClient,
		auditingClient: IAuditClient,
		accountsRepo: IChartOfAccountsRepo,
		ledgerAdapter: ILedgerAdapter
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._authorizationClient = authorizationClient;
		this._auditingClient = auditingClient;
		this._chartOfAccountsRepo = accountsRepo;
		this._ledgerAdapter = ledgerAdapter;

		const currenciesFileAbsolutePath: string = join(__dirname, CURRENCIES_FILE_NAME);
		try {
			this._currencies = JSON.parse(readFileSync(currenciesFileAbsolutePath, "utf-8"));
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	private enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
		for (const roleId of secCtx.rolesIds) {
			if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
				return;
			}
		}
		const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
		this._logger.isWarnEnabled() && this._logger.warn(error.message);
		throw error;
	}

	private _logAction(secCtx: CallSecurityContext, actionName: string) {
		this._logger.isDebugEnabled() && this._logger.debug(`User/App '${secCtx.username ?? secCtx.clientId}' called ${actionName}`);
	}

	async createAccounts(secCtx: CallSecurityContext, createAccountsArr: AccountsAndBalancesAccount[]): Promise<string[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_ACCOUNT);
		this._logAction(secCtx, "createAccounts");

		// Extract the ids which were provided.
		const internalAccountIds: string[] = [];
		createAccountsArr.forEach((account) => {
			if (account.id) {
				internalAccountIds.push(account.id);
			}
		});

		if (internalAccountIds.length >= 0) {
			const accountsExist: boolean = await this._chartOfAccountsRepo.accountsExistByInternalIds(internalAccountIds);
			if (accountsExist) {
				throw new AccountAlreadyExistsError(`Account with Id: ${internalAccountIds} already exists`);
			}
		}

		const coaAccounts: CoaAccount[] = [];
		const ledgerAdapterAccounts: LedgerAdapterAccount[] = [];
		for (const account of createAccountsArr) {

			if (account.ownerId === "") { // provided but empty
				throw new InvalidAccountParametersError("Invalid account.ownerId");
			}

			if (account.type!=="FEE" &&
				account.type!=="POSITION" &&
				account.type!=="SETTLEMENT" &&
				account.type!=="HUB_MULTILATERAL_SETTLEMENT" &&
				account.type!=="HUB_RECONCILIATION") {
				throw new InvalidAccountParametersError("Invalid account.type");
			}

			// Validate the currency code and get the currency.
			const currency: {code: string, decimals: number} | undefined
				= this._currencies.find((value) => value.code===account.currencyCode);
			if (!currency) {
				throw new CurrencyCodeNotFoundError(`Currency code: ${account.currencyCode} not found`);
			}

			// Generate a random UUId, if needed.
			account.id = account.id ?? randomUUID();

			// reset starting values
			account.state = "ACTIVE";
			account.postedDebitBalance = account.pendingDebitBalance =
				account.postedCreditBalance = account.pendingCreditBalance = "0";
			account.timestampLastJournalEntry = null;


			const coaAccount: CoaAccount = {
				id: account.id,
				ledgerAccountId: account.id, // try this, reset after we get the final id from the ledgerImplementation
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
				currencyDecimals: currency.decimals,
				postedDebitBalance: null,
				pendingDebitBalance: null,
				postedCreditBalance: null,
				pendingCreditBalance: null,
				timestampLastJournalEntry: null
			};
			ledgerAdapterAccounts.push(ledgerAdapterAccount);
		}

		let accountIds: string[];
		try {
			accountIds = await this._ledgerAdapter.createAccounts(ledgerAdapterAccounts);
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}

		await this._chartOfAccountsRepo.storeAccounts(coaAccounts);

		return accountIds;
	}

	async createJournalEntries(secCtx: CallSecurityContext, journalEntries: AcountsAndBalancesJournalEntry[]): Promise<string[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_JOURNAL_ENTRY);
		this._logAction(secCtx, "createJournalEntries");

		const now = Date.now();

		const ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[]
			= journalEntries.map((journalEntry) => {

			// Generate a random UUId, if none provided
			journalEntry.id = journalEntry.id ?? randomUUID();

			// set the timestamp
			journalEntry.timestamp = now;

			// Validate the currency code and get the currency.
			const currency: {code: string, decimals: number} | undefined
				= this._currencies.find((currency) => {
				return currency.code === journalEntry.currencyCode;
			});
			if (!currency) {
				throw new CurrencyCodeNotFoundError();
			}

			const ledgerAdapterJournalEntry: LedgerAdapterJournalEntry = {
				id: journalEntry.id,
				ownerId: journalEntry.ownerId || null,
				currencyCode: journalEntry.currencyCode,
				currencyDecimals: currency.decimals,
				amount: journalEntry.amount,
				pending: journalEntry.pending,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp
			};
			return ledgerAdapterJournalEntry;
		});

		let journalEntryIds: string[];
		try {
			journalEntryIds = await this._ledgerAdapter.createJournalEntries(ledgerAdapterJournalEntries);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		return journalEntryIds;
	}

	async getAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<AccountsAndBalancesAccount[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByIds");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccountsByInternalIds(accountIds);
		if (!coaAccounts.length) {
			return [];
		}

		const accounts: AccountsAndBalancesAccount[] = await this._getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

	async getAccountsByOwnerId(secCtx: CallSecurityContext, ownerId: string): Promise<AccountsAndBalancesAccount[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByOwnerId");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccountsByOwnerId(ownerId);
		if (!coaAccounts.length) {
			return [];
		}

		const accounts: AccountsAndBalancesAccount[] = await this._getAccountsByExternalIdsOfCoaAccounts(coaAccounts);
		return accounts;
	}

	async getJournalEntriesByAccountId(secCtx: CallSecurityContext, accountId: string): Promise<AcountsAndBalancesJournalEntry[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_JOURNAL_ENTRY);
		this._logAction(secCtx, "getJournalEntriesByAccountId");

		const coaAccount: CoaAccount | undefined =
			(await this._chartOfAccountsRepo.getAccountsByInternalIds([accountId]))[0];
		if (!coaAccount) {
			return [];
		}

		let ledgerAdapterJournalEntries: LedgerAdapterJournalEntry[];
		try {
			ledgerAdapterJournalEntries =
				await this._ledgerAdapter.getJournalEntriesByAccountId(accountId, coaAccount.currencyDecimals);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		const journalEntries: AcountsAndBalancesJournalEntry[] = ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const journalEntry: AcountsAndBalancesJournalEntry = {
				id: ledgerAdapterJournalEntry.id,
				ownerId: ledgerAdapterJournalEntry.ownerId,
				currencyCode: ledgerAdapterJournalEntry.currencyCode,
				amount: ledgerAdapterJournalEntry.amount,
				pending: ledgerAdapterJournalEntry.pending,
				debitedAccountId: ledgerAdapterJournalEntry.debitedAccountId,
				creditedAccountId: ledgerAdapterJournalEntry.creditedAccountId,
				timestamp: ledgerAdapterJournalEntry.timestamp
			};
			return journalEntry;
		});
		return journalEntries;
	}

	async deleteAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_DELETE_ACCOUNT);
		this._logAction(secCtx, "deleteAccountsByIds");

		const accounts = await this._chartOfAccountsRepo.getAccountsByInternalIds(accountIds);
		if (!accounts || accounts.length <= 0) {
			throw new AccountNotFoundError();
		}

		if (accounts[0].state !== "ACTIVE") {
			throw new AccountsAndBalancesError("Cannot deactivate an account that is not active");
		}
		try {
			await this._ledgerAdapter.deleteAccountsByIds(accountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		await this._chartOfAccountsRepo.updateAccountStatesByInternalIds(accountIds, "DELETED");
	}

	async deactivateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_DEACTIVATE_ACCOUNT);
		this._logAction(secCtx, "deactivateAccountsByIds");

		const accounts = await this._chartOfAccountsRepo.getAccountsByInternalIds(accountIds);
		if (!accounts || accounts.length <= 0) {
			throw new AccountNotFoundError();
		}

		if (accounts[0].state!=="ACTIVE") {
			throw new AccountsAndBalancesError("Cannot deactivate an account that is not active");
		}

		try {
			await this._ledgerAdapter.deactivateAccountsByIds(accountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		await this._chartOfAccountsRepo.updateAccountStatesByInternalIds(accountIds, "INACTIVE");
	}

	async reactivateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_REACTIVATE_ACCOUNT);
		this._logAction(secCtx, "reactivateAccountsByIds");

		const accounts = await this._chartOfAccountsRepo.getAccountsByInternalIds(accountIds);
		if (!accounts || accounts.length<=0) {
			throw new AccountNotFoundError();
		}

		if(accounts[0].state !== "INACTIVE"){
			throw new AccountsAndBalancesError("Cannot reactivate an account that is not inactive");
		}

		try {
			await this._ledgerAdapter.reactivateAccountsByIds(accountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		await this._chartOfAccountsRepo.updateAccountStatesByInternalIds(accountIds, "ACTIVE");
	}

	private async _getAccountsByExternalIdsOfCoaAccounts(coaAccounts: CoaAccount[]): Promise<AccountsAndBalancesAccount[]> {
		const externalAccountIds: LedgerAdapterRequestId[] = coaAccounts.map((coaAccount) => {
			return {id: coaAccount.ledgerAccountId, currencyDecimals: coaAccount.currencyDecimals};
		});

		let ledgerAdapterAccounts: LedgerAdapterAccount[];
		try {
			ledgerAdapterAccounts = await this._ledgerAdapter.getAccountsByIds(externalAccountIds);
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		const accounts: AccountsAndBalancesAccount[] = ledgerAdapterAccounts.map((ledgerAdapterAccount) => {
			const coaAccount: CoaAccount | undefined = coaAccounts.find((coaAccount) => {
				return coaAccount.ledgerAccountId === ledgerAdapterAccount.id;
			});
			if (!coaAccount) {
				throw new Error();
			}

			const balance: string = this.calculateBalanceString(
				ledgerAdapterAccount.postedDebitBalance || "0",
				ledgerAdapterAccount.postedCreditBalance || "0",
				coaAccount.currencyDecimals
			);

			const account: AccountsAndBalancesAccount = {
				id: coaAccount.id,
				ownerId: coaAccount.ownerId,
				state: coaAccount.state,
				type: coaAccount.type,
				currencyCode: coaAccount.currencyCode,
				postedDebitBalance: ledgerAdapterAccount.postedDebitBalance,
				pendingDebitBalance: ledgerAdapterAccount.pendingDebitBalance,
				postedCreditBalance: ledgerAdapterAccount.postedCreditBalance,
				pendingCreditBalance: ledgerAdapterAccount.pendingCreditBalance,
				balance: balance,
				timestampLastJournalEntry: ledgerAdapterAccount.timestampLastJournalEntry
			};
			return account;
		});
		return accounts;
	}

	private calculateBalanceString(debitBalanceString: string, creditBalanceString: string, currencyDecimals: number): string {
		const debitBalanceBigint: bigint = stringToBigint(debitBalanceString, currencyDecimals);
		const creditBalanceBigint: bigint = stringToBigint(creditBalanceString, currencyDecimals);
		const balanceBigint: bigint = creditBalanceBigint - debitBalanceBigint;
		const balanceString: string = bigintToString(balanceBigint, currencyDecimals);
		return balanceString;
	}
}
