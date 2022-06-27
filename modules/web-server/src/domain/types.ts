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
	IJournalEntry,
	JournalEntryType
} from "@mojaloop/accounts-and-balances-private-types";
import {
	InvalidAccountIdTypeError,
	InvalidAccountStateError,
	InvalidAccountTypeError,
	InvalidAccountTypeTypeError,
	InvalidCreditAccountIdTypeError, InvalidCreditBalanceError, InvalidCreditBalanceTypeError,
	InvalidCurrencyTypeError, InvalidDebitAccountIdTypeError, InvalidDebitBalanceError, InvalidDebitBalanceTypeError,
	InvalidJournalEntryIdTypeError, InvalidJournalEntryTypeError, InvalidJournalEntryTypeTypeError,
	InvalidParticipantIdTypeError, InvalidTimeStampTypeError, InvalidTransferAmountError, InvalidTransferAmountTypeError,
	InvalidAccountStateTypeError
} from "./errors";

export class Account implements IAccount {
	id: string;
	participantId: string | null; // TODO.
	state: AccountState;
	type: AccountType;
	currency: string;
	creditBalance: number;
	debitBalance: number;

	constructor(
		id: string = "",
		participantId: string | null = null, // TODO.
		state: AccountState,
		type: AccountType,
		currency: string,
		creditBalance: number,
		debitBalance: number
	) {
		this.id = id;
		this.participantId = participantId;
		this.state = state;
		this.type = type;
		this.currency = currency;
		this.creditBalance = creditBalance;
		this.debitBalance = debitBalance;
	}

	static validateAccount(account: IAccount): void { // TODO: IAccount or Account?
		// id.
		if (typeof account.id !== "string") {
			throw new InvalidAccountIdTypeError();
		}
		// participantId.
		if (typeof account.participantId !== "string"
			&& account.participantId !== null) {
			throw new InvalidParticipantIdTypeError();
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
		// TODO: valid currency.
		// creditBalance.
		if (typeof account.creditBalance !== "number") {
			throw new InvalidCreditBalanceTypeError();
		}
		if (account.creditBalance < 0) {
			throw new InvalidCreditBalanceError();
		}
		// debitBalance.
		if (typeof account.debitBalance !== "number") {
			throw new InvalidDebitBalanceTypeError();
		}
		if (account.debitBalance < 0) {
			throw new InvalidDebitBalanceError();
		}
	}
}

export class JournalEntry implements IJournalEntry {
	id: string;
	participantId: string | null; // TODO.
	type: JournalEntryType;
	currency: string;
	creditAccountId: string;
	debitAccountId: string;
	transferAmount: number;
	timeStamp: Date;

	constructor(
		id: string = "",
		participantId: string | null = null, // TODO.
		type: JournalEntryType,
		currency: string,
		creditAccountId: string,
		debitAccountId: string,
		transferAmount: number,
		timeStamp: Date
	) {
		this.id = id;
		this.participantId = participantId;
		this.type = type;
		this.currency = currency;
		this.creditAccountId = creditAccountId;
		this.debitAccountId = debitAccountId;
		this.transferAmount = transferAmount;
		this.timeStamp = timeStamp;
	}

	static validateJournalEntry(journalEntry: IJournalEntry): void { // TODO: IJournalEntry or JournalEntry?
		// id.
		if (typeof journalEntry.id !== "string") {
			throw new InvalidJournalEntryIdTypeError();
		}
		// participantId.
		if (typeof journalEntry.participantId !== "string"
			&& journalEntry.participantId !== null) {
			throw new InvalidParticipantIdTypeError();
		}
		// type.
		if (typeof journalEntry.type !== "string") {
			throw new InvalidJournalEntryTypeTypeError();
		}
		// TODO.
		/*if (!(journalEntry.type in JournalEntryType)) {
			throw new InvalidJournalEntryTypeError();
		}*/
		// currency.
		if (typeof journalEntry.currency !== "string") {
			throw new InvalidCurrencyTypeError();
		}
		// TODO: valid currency.
		// creditAccountId.
		if (typeof journalEntry.creditAccountId !== "string") {
			throw new InvalidCreditAccountIdTypeError();
		}
		// debitAccountId.
		if (typeof journalEntry.debitAccountId !== "string") {
			throw new InvalidDebitAccountIdTypeError();
		}
		// transferAmount.
		if (typeof journalEntry.transferAmount !== "number") {
			throw new InvalidTransferAmountTypeError();
		}
		if (journalEntry.transferAmount <= 0) { // TODO: = 0?
			throw new InvalidTransferAmountError();
		}
		// timeStamp.
		if (typeof journalEntry.timeStamp !== "string") {
			throw new InvalidTimeStampTypeError();
		}
		// TODO: valid time stamp.
	}
}
