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

import {InvalidCreditBalanceError, InvalidCurrencyCodeError, InvalidDebitBalanceError} from "./errors";
import {AccountState, AccountType, IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ICurrency} from "./currency";
import {stringToBigint} from "../utils";
import {IInfrastructureAccountDto} from "./infrastructure";

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

	// TODO: change name.
	static getFromDto(accountDto: IAccountDto, currencies: ICurrency[]): Account {
		const currency: ICurrency | undefined = currencies.find(currency => {
			return currency.code === accountDto.currencyCode;
		});
		if (currency === undefined) {
			throw new InvalidCurrencyCodeError();
		}
		let creditBalance: bigint;
		let debitBalance: bigint;
		try {
			creditBalance = stringToBigint(accountDto.creditBalance, currency.decimals);
		} catch (error: unknown) {
			throw new InvalidCreditBalanceError();
		}
		try {
			debitBalance = stringToBigint(accountDto.debitBalance, currency.decimals);
		} catch (error: unknown) {
			throw new InvalidDebitBalanceError();
		}
		return new Account(
			accountDto.id,
			accountDto.externalId,
			accountDto.state,
			accountDto.type,
			accountDto.currencyCode,
			currency.decimals,
			creditBalance,
			debitBalance,
			accountDto.timestampLastJournalEntry
		);
	}

	// TODO: change name.
	static getFromInfrastructureDto(infrastructureAccountDto: IInfrastructureAccountDto): Account {
		return new Account(
			infrastructureAccountDto.id,
			infrastructureAccountDto.externalId,
			infrastructureAccountDto.state,
			infrastructureAccountDto.type,
			infrastructureAccountDto.currencyCode,
			infrastructureAccountDto.currencyDecimals,
			BigInt(infrastructureAccountDto.creditBalance),
			BigInt(infrastructureAccountDto.debitBalance),
			infrastructureAccountDto.timestampLastJournalEntry
		);
	}

	static getInfrastructureDto(account: Account): IInfrastructureAccountDto {
		/*const creditBalance: string = bigintToString(account.creditBalance, account.currencyDecimals);
		const debitBalance: string = bigintToString(account.debitBalance, account.currencyDecimals);*/
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

	/*static getDto(account: Account): IAccountDto {
		const creditBalance: string = bigintToString(account.creditBalance, account.currencyDecimals);
		const debitBalance: string = bigintToString(account.debitBalance, account.currencyDecimals);
		return {
			id: account.id,
			externalId: account.externalId,
			state: account.state,
			type: account.type,
			currencyCode: account.currencyCode,
			creditBalance: creditBalance,
			debitBalance: debitBalance,
			timestampLastJournalEntry: account.timestampLastJournalEntry
		};
	}*/

	static calculateBalance(account: Account): bigint {
		return account.creditBalance - account.debitBalance;
	}
}
