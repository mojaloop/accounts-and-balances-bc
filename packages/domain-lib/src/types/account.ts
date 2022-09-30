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

import {InvalidCreditBalanceError, InvalidDebitBalanceError} from "../errors";
import {AccountState, AccountType, IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

// TODO: implements/extends anything?
export class Account {
	id: string;
	externalId: string | null;
	state: AccountState;
	type: AccountType;
	currencyCode: string;
	currencyDecimals: number;
	creditBalance: bigint;
	debitBalance: bigint;
	timestampLastJournalEntry: number;

	constructor(
		id: string,
		externalId: string | null,
		state: AccountState,
		type: AccountType,
		currencyCode: string,
		currencyDecimals: number,
		creditBalance: bigint,
		debitBalance: bigint,
		timestampLastJournalEntry: number
	) {
		this.id = id;
		this.externalId = externalId;
		this.state = state;
		this.type = type;
		this.currencyCode = currencyCode;
		this.currencyDecimals = currencyDecimals;
		this.creditBalance = creditBalance;
		this.debitBalance = debitBalance;
		this.timestampLastJournalEntry = timestampLastJournalEntry;
	}

	static getFromDto(accountDto: IAccountDto): Account {
		let creditBalance: bigint;
		let debitBalance: bigint;

		/* TODO
		 1. SKIP FOR NOW, bad regex - validate input accountDto.creditBalance and accountDto.debitBalance strings with regex ^[-+]?(([0-9]+[.]?[0-9]*)|([.]?[0-9]+))$
		 2. find the currency decimal points for the input currency
		 3. convert accountDto.creditBalance and accountDto.debitBalance to ints according to the decimal points of the input currency
		 */

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
			accountDto.currencyCode,
			accountDto.currencyDecimals,
			creditBalance,
			debitBalance,
			accountDto.timestampLastJournalEntry
		);
	}

	static getDto(account: Account): IAccountDto {

		/* TODO
		 1. find the currency decimal points for the input currency
		 2. convert account.creditBalance and account.debitBalance to string according to the decimal points of the currency
		 3. SKIP FOR NOW, bad regex - maybe at the end validate the resulting strings with the regex validators above
		 */

		return {
			id: account.id,
			externalId: account.externalId,
			state: account.state,
			type: account.type,
			currencyCode: account.currencyCode,
			currencyDecimals: account.currencyDecimals,
			creditBalance: account.creditBalance.toString(),
			debitBalance: account.debitBalance.toString(),
			timestampLastJournalEntry: account.timestampLastJournalEntry
		};
	}

	static calculateBalance(account: Account): bigint {
		return account.creditBalance - account.debitBalance;
	}
}
