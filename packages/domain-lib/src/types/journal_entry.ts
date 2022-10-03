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

import {InvalidCurrencyCodeError, InvalidJournalEntryAmountError} from "./errors";
import {IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ICurrency} from "./currency";
import {bigintToString, stringToBigint} from "../utils";

// TODO: implements/extends anything?
export class JournalEntry {
	id: string;
	externalId: string | null;
	externalCategory: string | null;
	currencyCode: string;
	currencyDecimals: number;
	amount: bigint;
	creditedAccountId: string;
	debitedAccountId: string;
	timestamp: number;

	constructor(
		id: string,
		externalId: string | null,
		externalCategory: string | null,
		currencyCode: string,
		currencyDecimals: number,
		amount: bigint,
		creditedAccountId: string,
		debitedAccountId: string,
		timestamp: number
	) {
		this.id = id;
		this.externalId = externalId;
		this.externalCategory = externalCategory;
		this.currencyCode = currencyCode;
		this.currencyDecimals = currencyDecimals;
		this.amount = amount;
		this.creditedAccountId = creditedAccountId;
		this.debitedAccountId = debitedAccountId;
		this.timestamp = timestamp;
	}

	// TODO: change name.
	static FromDto(journalEntryDto: IJournalEntryDto, currencies: ICurrency[]): JournalEntry {
		const currency: ICurrency | undefined = currencies.find(currency => {
			return currency.code === journalEntryDto.currencyCode;
		});
		if (currency === undefined) {
			throw new InvalidCurrencyCodeError();
		}
		let amount: bigint;
		try {
			amount = stringToBigint(journalEntryDto.amount, currency.decimals);
		} catch (error: unknown) {
			throw new InvalidJournalEntryAmountError();
		}
		return new JournalEntry(
			journalEntryDto.id,
			journalEntryDto.externalId,
			journalEntryDto.externalCategory,
			journalEntryDto.currencyCode,
			currency.decimals,
			amount,
			journalEntryDto.creditedAccountId,
			journalEntryDto.debitedAccountId,
			journalEntryDto.timestamp
		);
	}

	static ToDto(journalEntry: JournalEntry): IJournalEntryDto {
		const amount: string = bigintToString(journalEntry.amount, journalEntry.currencyDecimals);
		return {
			id: journalEntry.id,
			externalId: journalEntry.externalId,
			externalCategory: journalEntry.externalCategory,
			currencyCode: journalEntry.currencyCode,
			amount: amount,
			creditedAccountId: journalEntry.creditedAccountId,
			debitedAccountId: journalEntry.debitedAccountId,
			timestamp: journalEntry.timestamp
		};
	}
}
