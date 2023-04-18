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
GetJournalEntriesByAccountId
 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/
"use strict";
import {
	AccountNotFoundError,
	AccountsAndBalancesAccountType, CurrencyCodeNotFoundError,
	InvalidAccountParametersError, InvalidJournalEntryParametersError
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {join} from "path";
import {readFileSync} from "fs";
import {randomUUID} from "crypto";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

import {IAuditClient, AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";

import {ForbiddenError, IAuthorizationClient, CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";
import {BuiltinLedgerPrivileges} from "./privilege_names";

import {bigintToString, stringToBigint} from "./converters";
import {
	BuiltinLedgerAccount,
	BuiltinLedgerAccountDto,
	BuiltinLedgerJournalEntry,
	BuiltinLedgerJournalEntryDto, CreatedIdMapResponse
} from "./entities";
import {IBuiltinLedgerAccountsRepo, IBuiltinLedgerJournalEntriesRepo} from "./infrastructure";

enum AuditingActions {
	BUILTIN_LEDGER_ACCOUNT_CREATED = "BUILTIN_LEDGER_ACCOUNT_CREATED",
	BUILTIN_LEDGER_JOURNAL_ENTRY_CREATED = "BUILTIN_LEDGER_JOURNAL_ENTRY_CREATED",
	BUILTIN_LEDGER_ACCOUNT_DELETED = "BUILTIN_LEDGER_ACCOUNT_DELETED",
	BUILTIN_LEDGER_ACCOUNT_DEACTIVATED = "BUILTIN_LEDGER_ACCOUNT_DEACTIVATED",
	BUILTIN_LEDGER_ACCOUNT_ACTIVATED = "BUILTIN_LEDGER_ACCOUNT_ACTIVATED"
}

const CURRENCIES_FILE_NAME = "currencies.json";

export class BuiltinLedgerAggregate {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _authorizationClient: IAuthorizationClient;
	private readonly _auditingClient: IAuditClient;
	private readonly _builtinLedgerAccountsRepo: IBuiltinLedgerAccountsRepo;
	private readonly _builtinLedgerJournalEntriesRepo: IBuiltinLedgerJournalEntriesRepo;
	private readonly _currencies: {code: string, decimals: number}[];

	constructor(
		logger: ILogger,
		authorizationClient: IAuthorizationClient,
		auditingClient: IAuditClient,
		accountsRepo: IBuiltinLedgerAccountsRepo,
		journalEntriesRepo: IBuiltinLedgerJournalEntriesRepo
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._authorizationClient = authorizationClient;
		this._auditingClient = auditingClient;
		this._builtinLedgerAccountsRepo = accountsRepo;
		this._builtinLedgerJournalEntriesRepo = journalEntriesRepo;

		const currenciesFileAbsolutePath: string = join(__dirname, CURRENCIES_FILE_NAME);
		try {
			this._currencies = JSON.parse(readFileSync(currenciesFileAbsolutePath, "utf-8"));
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	private _enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
		for (const roleId of secCtx.rolesIds) {
			if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
				return;
			}
		}
		const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
		this._logger.isWarnEnabled() && this._logger.warn(error.message);
		throw error;
	}

	private _logAction(secCtx: CallSecurityContext, actionName:string){
		this._logger.isDebugEnabled() && this._logger.debug(`User/App '${secCtx.username ?? secCtx.clientId}' called ${actionName}`);
	}

	private _getAuditSecurityContext(securityContext: CallSecurityContext): AuditSecurityContext {
		return {
			userId: securityContext.username,
			appId: securityContext.clientId,
			role: "" // TODO: get role.
		};
	}

	async createAccounts(
		secCtx: CallSecurityContext,
		createReq:{requestedId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string}[]
	): Promise<CreatedIdMapResponse[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_ACCOUNT);
		this._logAction(secCtx, "createAccounts");

		const accountIds: CreatedIdMapResponse[] = [];
		for (const request of createReq) {
			const accountId: CreatedIdMapResponse = await this._createAccount(
				secCtx,
				request.requestedId,
				request.accountType,
				request.currencyCode
			);

			accountIds.push(accountId);
		}
		return accountIds;
	}

	private async _createAccount(
		secCtx: CallSecurityContext,
		requestedId:string,
		accountType:AccountsAndBalancesAccountType,
		currencyCode: string
	): Promise<CreatedIdMapResponse> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_ACCOUNT);

		if (accountType!=="FEE" &&
			accountType!=="POSITION" &&
			accountType!=="SETTLEMENT" &&
			accountType!=="HUB_MULTILATERAL_SETTLEMENT" &&
			accountType!=="HUB_RECONCILIATION") {
			throw new InvalidAccountParametersError("Invalid accountType");
		}

		// Validate the currency code and get the currency.
		const currency = this._currencies.find((value) => value.code === currencyCode);
		if (!currency) {
			throw new CurrencyCodeNotFoundError();
		}

		// try to use requestedId, if used, create a new one
		let myId = requestedId || randomUUID();
		const found = await this._builtinLedgerAccountsRepo.getAccountsByIds([myId]);
		if(found && found.length>0)
			myId = randomUUID();


		const builtinLedgerAccount: BuiltinLedgerAccount = {
			id: myId,
			state: "ACTIVE",
			type: accountType,
			limitCheckMode: "NONE", // TODO: account mode should come from the request dto.
			currencyCode: currency.code,
			currencyDecimals: currency.decimals,
			postedDebitBalance: 0n,
			pendingDebitBalance: 0n,
			postedCreditBalance: 0n,
			pendingCreditBalance: 0n,
			timestampLastJournalEntry: null
		};

		// Store the account.
		try {
			await this._builtinLedgerAccountsRepo.storeNewAccount(builtinLedgerAccount);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		// TODO: wrap in try-catch block.
		await this._auditingClient.audit(
			AuditingActions.BUILTIN_LEDGER_ACCOUNT_CREATED,
			true,
			this._getAuditSecurityContext(secCtx),
			[{
				key: "builtinLedgerAccountId",
				value: builtinLedgerAccount.id
			}]
		);

		return {
			requestedId: requestedId,
			attributedId: myId
		};
	}

	async createJournalEntries(
		secCtx: CallSecurityContext,
		createReq: {requestedId: string, amountStr: string,	currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number,	ownerId: string, pending: boolean
		}[]
	): Promise<CreatedIdMapResponse[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_JOURNAL_ENTRY);
		this._logAction(secCtx, "createJournalEntries");

		const journalEntryIds: CreatedIdMapResponse[] = [];
		for (const req of createReq) {
			const idMapResponse: CreatedIdMapResponse = await this._createJournalEntry(
				secCtx,
				req.requestedId,
				req.amountStr,
				req.currencyCode,
				req.creditedAccountId,
				req.debitedAccountId,
				req.timestamp,
				req.ownerId,
				req.pending,
			);
			journalEntryIds.push(idMapResponse);
		}

		return journalEntryIds;
	}

	private async _createJournalEntry(
		secCtx: CallSecurityContext,
		requestedId:string,
		amountStr:string,
		currencyCode:string,
		creditedAccountId:string,
		debitedAccountId:string,
		timestamp:number,
		ownerId: string,
		pending: boolean
	): Promise<CreatedIdMapResponse> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_JOURNAL_ENTRY);

		if(!amountStr || !currencyCode || !debitedAccountId || !creditedAccountId){
			throw new InvalidJournalEntryParametersError("Invalid entry amount, currencyCode or accounts");
		}

		// Validate the currency code and get the currency obj.
		const currency = this._currencies.find((value) => value.code===currencyCode);
		if (!currency) {
			throw new CurrencyCodeNotFoundError();
		}

		// TODO must get and use the currencyDecimals defined in the account

		// try to use requestedId, if used, create a new one
		let myId = requestedId || randomUUID();
		const found = await this._builtinLedgerAccountsRepo.getAccountsByIds([myId]);
		if (found && found.length > 0)
			myId = randomUUID();

		// Convert the amount to bigint and validate it.
		let amount: bigint;
		try {
			amount = stringToBigint(amountStr, currency.decimals);
		} catch (error: unknown) {
			throw new InvalidJournalEntryParametersError("Invalid entry amount");
		}

		// Check if the debited and credited accounts are the same.
		if (creditedAccountId === debitedAccountId) {
			throw new InvalidJournalEntryParametersError("creditedAccountId and debitedAccountId cannot be the same");
		}

		const builtinLedgerJournalEntry: BuiltinLedgerJournalEntry = {
			id: myId,
			ownerId: ownerId,
			currencyCode: currency.code,
			currencyDecimals: currency.decimals,
			pending: pending,
			amount: amount,
			debitedAccountId: debitedAccountId,
			creditedAccountId: creditedAccountId,
			timestamp: timestamp
		};

		// check if both accounts exist
		const accs: BuiltinLedgerAccount[] = await this._builtinLedgerAccountsRepo.getAccountsByIds([creditedAccountId, debitedAccountId]) || [];
		const creditedAccount = accs.find(value => value.id === creditedAccountId);
		const debitedAccount = accs.find(value => value.id === debitedAccountId);

		if(!creditedAccount || !debitedAccount){
			const msg = "cannot find creditedAccountId or debitedAccountId in _createJournalEntry()";
			this._logger.warn(msg);
			throw new InvalidJournalEntryParametersError(msg);
		}
		if(creditedAccount.currencyCode !== currencyCode || debitedAccount.currencyCode !== currencyCode){
			const msg = "creditedAccountId or debitedAccountId in _createJournalEntry() don't match the entry currencyCode"
			this._logger.warn(msg);
			throw new InvalidJournalEntryParametersError(msg);
		}

		// TODO check limit mode in createEntry

		// Store the journal entry.
		await this._builtinLedgerJournalEntriesRepo.storeNewJournalEntry(builtinLedgerJournalEntry);

		try {
			// Update the debited account's debit balance and timestamp.
			const curDebitBalance = pending ? debitedAccount!.pendingDebitBalance:debitedAccount!.postedDebitBalance;
			const newDebitBalance: bigint = curDebitBalance + amount;
			await this._builtinLedgerAccountsRepo.updateAccountDebitBalanceAndTimestamp(
				debitedAccountId,
				newDebitBalance,
				pending,
				timestamp
			);

			// Update the credited account's credit balance and timestamp.
			const curCreditBalance = pending ? creditedAccount!.pendingCreditBalance:creditedAccount!.postedCreditBalance;
			const newCreditBalance: bigint = curCreditBalance + amount;
			await this._builtinLedgerAccountsRepo.updateAccountCreditBalanceAndTimestamp(
				creditedAccountId,
				newCreditBalance,
				pending,
				timestamp
			);
		}catch (error){
			// if this fails, revert "this._builtinLedgerJournalEntriesRepo.storeNewJournalEntry(builtinLedgerJournalEntry)"
			// TODO: insert another entry that is the reverse of  builtinLedgerJournalEntry above - reverses as a delete are forbidden by design (append only)
            // await this._builtinLedgerJournalEntriesRepo.reverseJournalEntry(builtinLedgerJournalEntry.id);

			this._logger.error(error);
			throw error;
		}

		await this._auditingClient.audit(
			AuditingActions.BUILTIN_LEDGER_JOURNAL_ENTRY_CREATED,
			true,
			this._getAuditSecurityContext(secCtx),
			[{
				key: "builtinLedgerJournalEntryId",
				value: builtinLedgerJournalEntry.id
			}]
		);

		return {
			requestedId: requestedId,
			attributedId: myId
		};

	}

	async getAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<BuiltinLedgerAccountDto[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByIds");

		let builtinLedgerAccounts: BuiltinLedgerAccount[];
		try {
			builtinLedgerAccounts = await this._builtinLedgerAccountsRepo.getAccountsByIds(accountIds);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		const builtinLedgerAccountDtos: BuiltinLedgerAccountDto[]
			= builtinLedgerAccounts.map((builtinLedgerAccount) => {
			const builtinLedgerAccountDto: BuiltinLedgerAccountDto = {
				id: builtinLedgerAccount.id,
				state: builtinLedgerAccount.state,
				type: builtinLedgerAccount.type,
				currencyCode: builtinLedgerAccount.currencyCode,
				postedDebitBalance: bigintToString(builtinLedgerAccount.postedDebitBalance, builtinLedgerAccount.currencyDecimals),
				pendingDebitBalance: bigintToString(builtinLedgerAccount.pendingDebitBalance, builtinLedgerAccount.currencyDecimals),
				postedCreditBalance: bigintToString(builtinLedgerAccount.postedCreditBalance, builtinLedgerAccount.currencyDecimals),
				pendingCreditBalance: bigintToString(builtinLedgerAccount.pendingCreditBalance, builtinLedgerAccount.currencyDecimals),
				timestampLastJournalEntry: builtinLedgerAccount.timestampLastJournalEntry
			};
			return builtinLedgerAccountDto;
		});
		return builtinLedgerAccountDtos;
	}

	async getJournalEntriesByAccountId(secCtx: CallSecurityContext, accountId: string): Promise<BuiltinLedgerJournalEntryDto[]> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_JOURNAL_ENTRY);
		this._logAction(secCtx, "getJournalEntriesByAccountId");

		let builtinLedgerJournalEntries: BuiltinLedgerJournalEntry[];
		try {
			builtinLedgerJournalEntries
				= await this._builtinLedgerJournalEntriesRepo.getJournalEntriesByAccountId(accountId);
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}

		const builtinLedgerJournalEntryDtos: BuiltinLedgerJournalEntryDto[]
			= builtinLedgerJournalEntries.map((builtinLedgerJournalEntry) => {
			return {
				id: builtinLedgerJournalEntry.id,
				ownerId: builtinLedgerJournalEntry.ownerId,
				currencyCode: builtinLedgerJournalEntry.currencyCode,
				pending: builtinLedgerJournalEntry.pending,
				amount: bigintToString(builtinLedgerJournalEntry.amount, builtinLedgerJournalEntry.currencyDecimals),
				debitedAccountId: builtinLedgerJournalEntry.debitedAccountId,
				creditedAccountId: builtinLedgerJournalEntry.creditedAccountId,
				timestamp: builtinLedgerJournalEntry.timestamp
			};
		});
		return builtinLedgerJournalEntryDtos;
	}

	async deleteAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_DELETE_ACCOUNT);
		this._logAction(secCtx, "deleteAccountsByIds");

		try {
			await this._builtinLedgerAccountsRepo.updateAccountStatesByIds(accountIds, "DELETED");
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	async deactivateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_DEACTIVATE_ACCOUNT);
		this._logAction(secCtx, "deactivateAccountsByIds");

		try {
			await this._builtinLedgerAccountsRepo.updateAccountStatesByIds(accountIds, "INACTIVE");
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}

	async activateAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<void> {
		this._enforcePrivilege(secCtx, BuiltinLedgerPrivileges.BUILTIN_LEDGER_ACTIVATE_ACCOUNT);
		this._logAction(secCtx, "activateAccountsByIds");

		try {
			await this._builtinLedgerAccountsRepo.updateAccountStatesByIds(accountIds, "ACTIVE");
		} catch (error: unknown) {
			this._logger.error(error);
			throw error;
		}
	}
}
