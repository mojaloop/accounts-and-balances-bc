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
	InvalidCreditBalanceError,
	InvalidDebitBalanceError, InvalidExternalIdError
} from "../errors";
import {AccountState, AccountType, IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

// TODO: implements/extends anything?
export class Account {
	id: string;
	externalId: string | null;
	state: AccountState;
	type: AccountType;
	currency: string;
	creditBalance: bigint;
	debitBalance: bigint;
	timestampLastJournalEntry: number;

	constructor(
		id: string,
		externalId: string | null,
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

	static getFromDto(accountDto: IAccountDto): Account {
		let creditBalance: bigint;
		let debitBalance: bigint;
		try {
			creditBalance = BigInt(accountDto.creditBalance);
		} catch(error: unknown) {
			throw new InvalidCreditBalanceError();
		}
		try {
			debitBalance = BigInt(accountDto.debitBalance);
		} catch(error: unknown) {
			throw new InvalidDebitBalanceError();
		}
		return new Account(
			accountDto.id,
			accountDto.externalId,
			accountDto.state,
			accountDto.type,
			accountDto.currency,
			creditBalance,
			debitBalance,
			accountDto.timestampLastJournalEntry
		);
	}

	static validate(account: Account): void {
		// External id.
		if (account.externalId === "") {
			throw new InvalidExternalIdError();
		}
		// Credit balance.
		if (account.creditBalance < 0) {
			throw new InvalidCreditBalanceError();
		}
		// Debit balance.
		if (account.debitBalance < 0) {
			throw new InvalidDebitBalanceError();
		}
	}

	static getDto(account: Account): IAccountDto {
		return {
			id: account.id,
			externalId: account.externalId,
			state: account.state,
			type: account.type,
			currency: account.currency,
			creditBalance: account.creditBalance.toString(),
			debitBalance: account.debitBalance.toString(),
			timestampLastJournalEntry: account.timestampLastJournalEntry
		};
	}
}
