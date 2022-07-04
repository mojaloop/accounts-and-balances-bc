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

import {
	AccountState,
	AccountType,
	IAccount,
	IJournalEntry
} from "@mojaloop/accounts-and-balances-private-types";
import {
	InvalidAccountIdTypeError,
	InvalidAccountStateError,
	InvalidAccountTypeError,
	InvalidAccountTypeTypeError,
	InvalidCreditBalanceError,
	InvalidCreditBalanceTypeError,
	InvalidCurrencyTypeError,
	InvalidDebitBalanceError,
	InvalidDebitBalanceTypeError,
	InvalidJournalEntryIdTypeError,
	InvalidAccountStateTypeError,
	InvalidBalanceTypeError,
	InvalidExternalIdTypeError,
	InvalidExternalCategoryTypeError,
	InvalidJournalEntryAmountTypeError,
	InvalidJournalEntryAmountError,
	InvalidCreditedAccountIdTypeError,
	InvalidDebitedAccountIdTypeError,
	InvalidBalanceError,
	InvalidTimeStampTypeError
} from "./errors";

export class Account implements IAccount {
	id: string;
	externalId: string | null;
	state: AccountState;
	type: AccountType;
	currency: string;
	creditBalance: bigint;
	debitBalance: bigint;
	timeStampLastJournalEntry: number;

	constructor(
		id: string,
		externalId: string | null = null,
		state: AccountState,
		type: AccountType,
		currency: string,
		creditBalance: bigint,
		debitBalance: bigint,
		timeStampLastJournalEntry: number
	) {
		this.id = id;
		this.externalId = externalId;
		this.state = state;
		this.type = type;
		this.currency = currency;
		this.creditBalance = creditBalance;
		this.debitBalance = debitBalance;
		this.timeStampLastJournalEntry = timeStampLastJournalEntry;
	}

	static validateAccount(account: IAccount): void { // TODO: IAccount or Account?
		// id.
		if (typeof account.id !== "string") {
			throw new InvalidAccountIdTypeError();
		}
		// externalId.
		if (typeof account.externalId !== "string"
			&& account.externalId !== null) {
			throw new InvalidExternalIdTypeError();
		}
		// state.
		if (typeof account.state !== "string") {
			throw new InvalidAccountStateTypeError();
		}
		if (!(account.state in AccountState)) {
			throw new InvalidAccountStateError();
		}
		// type.
		if (typeof account.type !== "string") {
			throw new InvalidAccountTypeTypeError();
		}
		if (!(account.type in AccountType)) {
			throw new InvalidAccountTypeError();
		}
		// currency.
		if (typeof account.currency !== "string") {
			throw new InvalidCurrencyTypeError();
		}
		// TODO: validate currency.
		// creditBalance.
		if (typeof account.creditBalance !== "number") { // TODO: bigint.
			throw new InvalidCreditBalanceTypeError();
		}
		if (account.creditBalance < 0) {
			throw new InvalidCreditBalanceError();
		}
		// debitBalance.
		if (typeof account.debitBalance !== "number") { // TODO: bigint.
			throw new InvalidDebitBalanceTypeError();
		}
		if (account.debitBalance < 0) {
			throw new InvalidDebitBalanceError();
		}
		// TODO: can the balance be negative?
		// timeStampLastJournalEntry.
		if (typeof account.timeStampLastJournalEntry !== "number") {
			throw new InvalidTimeStampTypeError();
		}
	}
}

export class JournalEntry implements IJournalEntry {
	id: string;
	externalId: string | null;
	externalCategory: string | null;
	currency: string;
	amount: bigint;
	creditedAccountId: string;
	debitedAccountId: string;
	timeStamp: number;

	constructor(
		id: string,
		externalId: string | null = null,
		externalCategory: string | null = null,
		currency: string,
		amount: bigint,
		creditedAccountId: string,
		debitedAccountId: string,
		timeStamp: number
	) {
		this.id = id;
		this.externalId = externalId;
		this.externalCategory = externalCategory;
		this.currency = currency;
		this.amount = amount;
		this.creditedAccountId = creditedAccountId;
		this.debitedAccountId = debitedAccountId;
		this.timeStamp = timeStamp;
	}

	static validateJournalEntry(journalEntry: IJournalEntry): void { // TODO: IJournalEntry or JournalEntry?
		// id.
		if (typeof journalEntry.id !== "string") {
			throw new InvalidJournalEntryIdTypeError();
		}
		// externalId.
		if (typeof journalEntry.externalId !== "string"
			&& journalEntry.externalId !== null) {
			throw new InvalidExternalIdTypeError();
		}
		// externalCategory.
		if (typeof journalEntry.externalCategory !== "string"
			&& journalEntry.externalCategory !== null) {
			throw new InvalidExternalCategoryTypeError();
		}
		// currency.
		if (typeof journalEntry.currency !== "string") {
			throw new InvalidCurrencyTypeError();
		}
		// TODO: validate currency.
		// amount.
		if (typeof journalEntry.amount !== "number") { // TODO: bigint.
			throw new InvalidJournalEntryAmountTypeError();
		}
		if (journalEntry.amount <= 0) {
			throw new InvalidJournalEntryAmountError();
		}
		// creditedAccountId.
		if (typeof journalEntry.creditedAccountId !== "string") {
			throw new InvalidCreditedAccountIdTypeError();
		}
		// debitedAccountId.
		if (typeof journalEntry.debitedAccountId !== "string") {
			throw new InvalidDebitedAccountIdTypeError();
		}
		// timeStamp.
		if (typeof journalEntry.timeStamp !== "number") {
			throw new InvalidTimeStampTypeError();
		}
	}
}
