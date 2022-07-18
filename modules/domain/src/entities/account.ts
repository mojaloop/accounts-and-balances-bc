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
	InvalidAccountIdError,
	InvalidAccountIdTypeError,
	InvalidAccountStateError,
	InvalidAccountStateTypeError,
	InvalidAccountTypeTypeError,
	InvalidCreditBalanceError,
	InvalidCreditBalanceTypeError,
	InvalidCurrencyTypeError,
	InvalidDebitBalanceError,
	InvalidDebitBalanceTypeError, InvalidExternalIdTypeError, InvalidTimeStampTypeError
} from "../errors";

import {IAccount, AccountState, AccountType} from "../types";

export class Account implements IAccount {
	id: string;
	externalId: string | null;
	state: AccountState;
	type: AccountType;
	currency: string; // https://en.wikipedia.org/wiki/ISO_4217
	creditBalance: bigint;
	debitBalance: bigint;
	timestampLastJournalEntry: number;

	constructor(
		id: string,
		externalId: string | null = null,
		state: AccountState,
		type: AccountType,
		currency: string,
		creditBalance: bigint,
		debitBalance: bigint,
		timestampLastJournalEntry: number
	) {
		this.id = id;
		this.externalId = externalId;
		this.state = state;
		this.type = type;
		this.currency = currency;
		this.creditBalance = creditBalance;
		this.debitBalance = debitBalance;
		this.timestampLastJournalEntry = timestampLastJournalEntry;
	}

	static validateAccount(account: Account): void {
		// id.
		if (typeof account.id !== "string") {
			throw new InvalidAccountIdTypeError();
		}
		if (account.id === "") {
			throw new InvalidAccountIdError();
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
		// type. // TODO validate against correct type (enum instead of string)
		if (typeof account.type !== "string") {
			throw new InvalidAccountTypeTypeError();
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
		if (typeof account.timestampLastJournalEntry !== "number") {
			throw new InvalidTimeStampTypeError();
		}
	}
}
