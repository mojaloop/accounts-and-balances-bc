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

import {AccountState, AccountType, IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {bigintToString} from "./converters";

// TODO: implements/extends anything?
export class Account {
	id: string;
	externalId: string | null;
	state: AccountState;
	type: AccountType;
	currencyCode: string;
	currencyDecimals: number;
	debitBalance: bigint;
	creditBalance: bigint;
	timestampLastJournalEntry: number | null;

	constructor(
		id: string,
		externalId: string | null,
		state: AccountState,
		type: AccountType,
		currencyCode: string,
		currencyDecimals: number,
		debitBalance: bigint,
		creditBalance: bigint,
		timestampLastJournalEntry: number | null
	) {
		this.id = id;
		this.externalId = externalId;
		this.state = state;
		this.type = type;
		this.currencyCode = currencyCode;
		this.currencyDecimals = currencyDecimals;
		this.debitBalance = debitBalance;
		this.creditBalance = creditBalance;
		this.timestampLastJournalEntry = timestampLastJournalEntry;
	}

	toDto(): IAccountDto {
		const debitBalance: string = bigintToString(this.debitBalance, this.currencyDecimals);
		const creditBalance: string = bigintToString(this.creditBalance, this.currencyDecimals);

		const accountDto: IAccountDto = {
			id: this.id,
			externalId: this.externalId,
			state: this.state,
			type: this.type,
			currencyCode: this.currencyCode,
			currencyDecimals: this.currencyDecimals,
			debitBalance: debitBalance,
			creditBalance: creditBalance,
			timestampLastJournalEntry: this.timestampLastJournalEntry
		};
		return accountDto;
	}

	calculateBalance(): bigint {
		const balance: bigint = this.creditBalance - this.debitBalance;
		return balance;
	}
}
