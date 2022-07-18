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

import {IJournalEntry} from "../types";
import {
	InvalidCreditedAccountIdTypeError,
	InvalidCurrencyTypeError, InvalidDebitedAccountIdTypeError, InvalidExternalCategoryTypeError,
	InvalidExternalIdTypeError,
	InvalidJournalEntryAmountError, InvalidJournalEntryAmountTypeError,
	InvalidJournalEntryIdError,
	InvalidJournalEntryIdTypeError,
	InvalidTimeStampTypeError
} from "../errors";

export class JournalEntry implements IJournalEntry {
	id: string;
	externalId: string | null;
	externalCategory: string | null;
	currency: string;
	amount: bigint;
	creditedAccountId: string;
	debitedAccountId: string;
	timestamp: number;

	constructor(
		id: string,
		externalId: string | null = null,
		externalCategory: string | null = null,
		currency: string,
		amount: bigint,
		creditedAccountId: string,
		debitedAccountId: string,
		timestamp: number
	) {
		this.id = id;
		this.externalId = externalId;
		this.externalCategory = externalCategory;
		this.currency = currency;
		this.amount = amount;
		this.creditedAccountId = creditedAccountId;
		this.debitedAccountId = debitedAccountId;
		this.timestamp = timestamp;
	}

	static validateJournalEntry(journalEntry: JournalEntry): void {
		// id.
		if (typeof journalEntry.id !== "string") {
			throw new InvalidJournalEntryIdTypeError();
		}
		if (journalEntry.id === "") {
			throw new InvalidJournalEntryIdError();
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
		if (typeof journalEntry.timestamp !== "number") {
			throw new InvalidTimeStampTypeError();
		}
	}
}
