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



import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuthorizationClient, UnauthorizedError, CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";
import {ForbiddenError} from "@mojaloop/security-bc-public-types-lib/dist/index";
import {ChartOfAccountsPrivilegeNames} from "../domain/privilege_names";
import {
	ILedgerAdapter,
	LedgerAdapterAccount, LedgerAdapterCreateResponseItem,
	LedgerAdapterJournalEntry,
	LedgerAdapterRequestId
} from "./infrastructure-types/ledger_adapter";
import {CoaAccount} from "./coa_account";

import {
	AccountAlreadyExistsError,
	AccountNotFoundError,
	AccountsAndBalancesError,
	AccountsAndBalancesAccount,
	AccountsAndBalancesJournalEntry,
	CurrencyCodeNotFoundError,
	InvalidAccountParametersError,
	PayerFailedLiquidityCheckError,
	AccountsAndBalancesAccountType,
    InvalidJournalEntryParametersError
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

	private _getCurrencyOrThrow(currencyCode:string): {code: string, decimals: number}{
		// Validate the currency code and get the currency.
		const currency: { code: string, decimals: number } | undefined
			= this._currencies.find((value) => value.code === currencyCode);
		if (!currency) {
			throw new CurrencyCodeNotFoundError(`Currency code: ${currencyCode} not found`);
		}
		return currency;
	}

	async checkLiquidAndReserve(
		secCtx: CallSecurityContext,
		payerPositionAccountId: string, payerLiquidityAccountId: string, hubJokeAccountId:string,
		transferAmount: string, currencyCode:string, payerNetDebitCap:string, transferId:string
	):Promise<void>{

		// find CoA accounts
		const coaAccounts = await this._chartOfAccountsRepo.getAccounts([payerPositionAccountId, payerLiquidityAccountId, hubJokeAccountId]);
		const payerPosCoaAcc = coaAccounts.find(value => value.id === payerPositionAccountId);
		const payerLiqCoaAcc = coaAccounts.find(value => value.id === payerLiquidityAccountId);
		const hubJokeCoaAcc = coaAccounts.find(value => value.id === hubJokeAccountId);

		if(!payerPosCoaAcc || !payerLiqCoaAcc || !hubJokeCoaAcc ){
			const err = new AccountNotFoundError("Invalid or not found CoA accounts on CheckLiquidAndReserve request");
			this._logger.warn(err.message);
			throw err;
		}

		// Validate the currency code and get the currency.
		const currency = this._getCurrencyOrThrow(currencyCode);

		// get accounts and their balances from the ledger
		const ledgerAccounts = await this._ledgerAdapter.getAccountsByIds([
			{id: payerPosCoaAcc.ledgerAccountId, currencyDecimals: currency.decimals},
			{id: payerLiqCoaAcc.ledgerAccountId, currencyDecimals: currency.decimals}
		]);
		const payerPosLedgerAcc = ledgerAccounts.find(value => value.id === payerPosCoaAcc.ledgerAccountId);
		const payerLiqLedgerAcc = ledgerAccounts.find(value => value.id === payerLiqCoaAcc.ledgerAccountId);

		if (!payerPosLedgerAcc || !payerLiqLedgerAcc) {
			const err = new AccountNotFoundError("Could not find payer accounts on the ledger service");
			this._logger.warn(err.message);
			throw err;
		}

		// check liquidity -> pos.post.dr + pos.pend.dr - pos.post.cr + trx.amount <= liq.bal - NDC
		const payerHasLiq = this._checkParticipantLiquidity(
			payerPosLedgerAcc, payerLiqLedgerAcc, transferAmount,
			payerNetDebitCap, currency.decimals);

		if(!payerHasLiq){
			// TODO audit PayerFailedLiquidityCheckError
			const err = new PayerFailedLiquidityCheckError();
			this._logger.warn(err.message);
			throw err;
		}

		const ledgerEntry: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		} = {
			requestedId: randomUUID(),
			pending: true,
			amountStr: transferAmount,
			ownerId: transferId,
			debitedAccountId: payerPosCoaAcc.ledgerAccountId,
			creditedAccountId: hubJokeCoaAcc.ledgerAccountId,
			currencyCode: currencyCode,
			timestamp: Date.now()
		};

		try {
			await this._ledgerAdapter.createJournalEntries([ledgerEntry]);
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
	}

	private _checkParticipantLiquidity(
		payerPos:LedgerAdapterAccount, payerLiq:LedgerAdapterAccount,
		trxAmountStr:string, payerNdcStr:string, currencyDecimals:number
	):boolean{
		const positionPostDr = stringToBigint(payerPos.postedDebitBalance || "0", currencyDecimals);
		const positionPendDr = stringToBigint(payerPos.pendingDebitBalance || "0", currencyDecimals);
		const positionPostCr = stringToBigint(payerPos.postedCreditBalance || "0", currencyDecimals);

		const liquidityPostDr = stringToBigint(payerLiq.postedDebitBalance || "0", currencyDecimals);
		const liquidityPostCr = stringToBigint(payerLiq.postedCreditBalance || "0", currencyDecimals);

		const trxAmount = stringToBigint(trxAmountStr, currencyDecimals);
		const payerNdc = stringToBigint(payerNdcStr, currencyDecimals);

		const liquidityBal = liquidityPostCr - liquidityPostDr;

		if(positionPostDr + positionPendDr - positionPostCr + trxAmount <= liquidityBal - payerNdc){
			return true;
		}else{
			return false;
		}
	}

	async cancelReservationAndCommit(
		secCtx: CallSecurityContext,
		payerPositionAccountId: string, payeePositionAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, transferId: string
	): Promise<void> {

		// find CoA accounts
		const coaAccounts = await this._chartOfAccountsRepo.getAccounts([payerPositionAccountId, payeePositionAccountId, hubJokeAccountId]);
		const payerPosCoaAcc = coaAccounts.find(value => value.id === payerPositionAccountId);
		const payeePosCoaAcc = coaAccounts.find(value => value.id === payeePositionAccountId);
		const hubJokeCoaAcc = coaAccounts.find(value => value.id===hubJokeAccountId);

		if (!payerPosCoaAcc || !payeePosCoaAcc || !hubJokeCoaAcc) {
			const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservationAndCommit request");
			this._logger.warn(err.message);
			throw err;
		}

		// Validate the currency code and get the currency.
		const currency = this._getCurrencyOrThrow(currencyCode);
		const now = Date.now();
		const amount = stringToBigint(transferAmount, currency.decimals);
		const revertAmount = amount * -1n;

		// Cancel/void the reservation (negative amount pending entry)
		const cancelReservationEntry: {requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		} = {
			requestedId: randomUUID(),
			pending: true,
			amountStr: bigintToString(revertAmount, currency.decimals),
			ownerId: transferId,
			debitedAccountId: payerPosCoaAcc.ledgerAccountId,
			creditedAccountId: hubJokeCoaAcc.ledgerAccountId,
			currencyCode: currencyCode,
			timestamp: now
		};

		// Move funds from payer position to payee position (normal entry)
		const commitEntry: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		} = {
			requestedId: randomUUID(),
			pending: false,
			amountStr: bigintToString(amount, currency.decimals),
			ownerId: transferId,
			debitedAccountId: payerPosCoaAcc.ledgerAccountId,
			creditedAccountId: payeePosCoaAcc.ledgerAccountId,
			currencyCode: currencyCode,
			timestamp: now
		};

		try {
			await this._ledgerAdapter.createJournalEntries([cancelReservationEntry, commitEntry]);
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
	}

	async cancelReservation(
		secCtx: CallSecurityContext,
		payerPositionAccountId: string, hubJokeAccountId: string,
		transferAmount: string, currencyCode: string, transferId: string
	): Promise<void> {
		// find CoA accounts
		const coaAccounts = await this._chartOfAccountsRepo.getAccounts([payerPositionAccountId, hubJokeAccountId]);
		const payerPosCoaAcc = coaAccounts.find(value => value.id===payerPositionAccountId);
		const hubJokeCoaAcc = coaAccounts.find(value => value.id===hubJokeAccountId);

		if (!payerPosCoaAcc || !hubJokeCoaAcc) {
			const err = new AccountNotFoundError("Invalid or not found CoA accounts on cancelReservation request");
			this._logger.warn(err.message);
			throw err;
		}

		// Validate the currency code and get the currency.
		const currency = this._getCurrencyOrThrow(currencyCode);

		const amount = stringToBigint(transferAmount, currency.decimals);
		const revertAmount = amount * -1n;

		// Cancel/void the reservation (negative amount pending entry)
		const cancelReservationEntry: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		} = {
			requestedId: randomUUID(),
			pending: true,
			amountStr: bigintToString(revertAmount, currency.decimals),
			ownerId: transferId,
			debitedAccountId: payerPosCoaAcc.ledgerAccountId,
			creditedAccountId: hubJokeCoaAcc.ledgerAccountId,
			currencyCode: currencyCode,
			timestamp: Date.now()
		};

		try {
			await this._ledgerAdapter.createJournalEntries([cancelReservationEntry]);
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
	}

	async createAccounts(
		secCtx: CallSecurityContext,
		createReqs: { requestedId: string, ownerId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string }[]
	): Promise<string[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_ACCOUNT);
		this._logAction(secCtx, "createAccounts");

		// Extract the ids which were provided.
		const internalAccountIds: string[] = [];
		createReqs.forEach((account) => {
			if (account.requestedId) {
				internalAccountIds.push(account.requestedId);
			}
		});

		if (internalAccountIds.length >= 0) {
			const accountsExist: boolean = await this._chartOfAccountsRepo.accountsExistByInternalIds(internalAccountIds);
			if (accountsExist) {
				throw new AccountAlreadyExistsError(`Account with Id: ${internalAccountIds} already exists`);
			}
		}

		const coaAccounts: CoaAccount[] = [];
		const ledgerCreateReqs: { requestedId: string, type: string, currencyCode: string }[] = [];
		const accountIds: string[] = [];

		for (const request of createReqs) {
			if (!request.ownerId) {
				throw new InvalidAccountParametersError("Invalid account.ownerId");
			}

			if (request.accountType!=="FEE" &&
				request.accountType!=="POSITION" &&
				request.accountType!=="SETTLEMENT" &&
				request.accountType!=="HUB_MULTILATERAL_SETTLEMENT" &&
				request.accountType!=="HUB_RECONCILIATION") {
				throw new InvalidAccountParametersError("Invalid account.type");
			}

			// Validate the currency code and get the currency.
			const currency = this._getCurrencyOrThrow(request.currencyCode);

			// Note: the caller createAccounts() has already checked for possible duplicate ids
			// try to use requestedId, if used, create a new one
			request.requestedId = request.requestedId || randomUUID();
			accountIds.push(request.requestedId);

			coaAccounts.push({
				id: request.requestedId,
				ledgerAccountId: request.requestedId, // try this, reset after we get the final id from the ledgerImplementation
				ownerId: request.ownerId,
				state: "ACTIVE",
				type: request.accountType,
				currencyCode: request.currencyCode,
				currencyDecimals: currency.decimals
			});

			ledgerCreateReqs.push({
				requestedId: request.requestedId,
				type: request.accountType,
				currencyCode: request.currencyCode,
			});
		}


		try {
			await this._chartOfAccountsRepo.storeAccounts(coaAccounts);
			const idsResponse = await this._ledgerAdapter.createAccounts(ledgerCreateReqs);
			if(idsResponse.length !==ledgerCreateReqs.length){
				const err = new AccountsAndBalancesError("Could create all the request accounts in the ledger system");
				this._logger.error(err);
				throw err;
			}

			for(const resp of idsResponse){
				if(resp.attributedId !== resp.requestedId){
					const coaAcc = coaAccounts.find(value => value.id === resp.requestedId);
					if(!coaAcc){
						const err = new AccountsAndBalancesError("Could not found CoA account to update ledger account id");
						this._logger.error(err);
						throw err;
					}
					coaAcc.ledgerAccountId = resp.attributedId;
					await this._chartOfAccountsRepo.storeAccounts([coaAcc]);
				}
			}
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
		return accountIds;
	}

	async createJournalEntries(
		secCtx: CallSecurityContext,
		createReqs: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		}[]
	): Promise<string[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_CREATE_JOURNAL_ENTRY);
		this._logAction(secCtx, "createJournalEntries");

		const now = Date.now();

		for(const req of createReqs){
			// Validate the currency code and get the currency.
			// we don't actually need it, this just to assert it exists
			this._getCurrencyOrThrow(req.currencyCode);

			if (!req.amountStr || !req.currencyCode || !req.debitedAccountId || !req.creditedAccountId) {
				throw new InvalidJournalEntryParametersError("Invalid entry amount, currencyCode or accounts");
			}

			req.requestedId = req.requestedId || randomUUID();
			req.timestamp = now;
		}

		let journalEntryIds: LedgerAdapterCreateResponseItem[];
		try {
			journalEntryIds = await this._ledgerAdapter.createJournalEntries(createReqs);
			// journal entries are not persisted at the CoA service, nothing else to do
		} catch (error: any) {
			this._logger.error(error);
			if (error instanceof AccountsAndBalancesError) {
				throw error;
			}
			throw new AccountsAndBalancesError(error.message ?? "unknown error");
		}

		// return the ids attributed by the ledger
		return journalEntryIds.map(item => item.attributedId);
	}

	async getAccountsByIds(secCtx: CallSecurityContext, accountIds: string[]): Promise<AccountsAndBalancesAccount[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_ACCOUNT);
		this._logAction(secCtx, "getAccountsByIds");

		const coaAccounts: CoaAccount[] = await this._chartOfAccountsRepo.getAccounts(accountIds);
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

	async getJournalEntriesByAccountId(secCtx: CallSecurityContext, accountId: string): Promise<AccountsAndBalancesJournalEntry[]> {
		this.enforcePrivilege(secCtx, ChartOfAccountsPrivilegeNames.COA_VIEW_JOURNAL_ENTRY);
		this._logAction(secCtx, "getJournalEntriesByAccountId");

		const coaAccount: CoaAccount | undefined =
			(await this._chartOfAccountsRepo.getAccounts([accountId]))[0];
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

		const journalEntries: AccountsAndBalancesJournalEntry[] = ledgerAdapterJournalEntries.map((ledgerAdapterJournalEntry) => {
			const journalEntry: AccountsAndBalancesJournalEntry = {
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

		const accounts = await this._chartOfAccountsRepo.getAccounts(accountIds);
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

		const accounts = await this._chartOfAccountsRepo.getAccounts(accountIds);
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

		const accounts = await this._chartOfAccountsRepo.getAccounts(accountIds);
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

			const balance: string = this._calculateBalanceString(
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

	private _calculateBalanceString(debitBalanceString: string, creditBalanceString: string, currencyDecimals: number): string {
		const debitBalanceBigint: bigint = stringToBigint(debitBalanceString, currencyDecimals);
		const creditBalanceBigint: bigint = stringToBigint(creditBalanceString, currencyDecimals);
		const balanceBigint: bigint = creditBalanceBigint - debitBalanceBigint;
		const balanceString: string = bigintToString(balanceBigint, currencyDecimals);
		return balanceString;
	}
}
