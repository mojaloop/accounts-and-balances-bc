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

import {IInfrastructureAccountDto, IInfrastructureJournalEntryDto} from "./types/infrastructure";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const regex: RegExp = /^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[0-9])?$/;

export function stringToBigint(stringValue: string, decimals: number): bigint {
	if (!regex.test(stringValue)) {
		throw new Error();
	}

	let existingDecimals: number = 0;
	if (stringValue.indexOf(".") > -1) {
		existingDecimals = stringValue.split(".")[1].length;
	}
	if (existingDecimals > decimals) {
		throw new Error();
	}
	const bigIntStr: string =
		stringValue.replace(".", "")
		+ "0".repeat(decimals - existingDecimals);

	let bigintValue: bigint;
	try {
		bigintValue = BigInt(bigIntStr);
	} catch(error: unknown) {
		throw new Error();
	}

	return bigintValue;
}

export function bigintToString(bigintValue: bigint, decimals: number): string {
	const stringValue: string = bigintValue.toString();
	const dotIdx: number = stringValue.length - decimals;
	const stringValueWithDot: string = stringValue.slice(0, dotIdx) + "." + stringValue.slice(dotIdx);
	return stringValueWithDot;
}

// TODO: change name.
export function formatString(str: string, decimals: number): string {
	const dotIdx: number = str.length - decimals;
	const stringValueWithDot: string = str.slice(0, dotIdx) + "." + str.slice(dotIdx);
	let finalString: string = stringValueWithDot;
	while (finalString[finalString.length - 1] === "0") {
		finalString = finalString.slice(0, finalString.length - 1);
	}
	if (finalString[finalString.length - 1] === ".") {
		finalString = finalString.slice(0, finalString.length - 1);
	}
	return finalString;
}

// TODO: change name.
export function infrastructureAccountDtoToPublicTypesAccountDto(
	infrastructureAccountDto: IInfrastructureAccountDto
): IAccountDto {
	return {
		id: infrastructureAccountDto.id,
		externalId: infrastructureAccountDto.externalId,
		state: infrastructureAccountDto.state,
		type: infrastructureAccountDto.type,
		currencyCode: infrastructureAccountDto.currencyCode,
		creditBalance: formatString(infrastructureAccountDto.creditBalance, infrastructureAccountDto.currencyDecimals),
		debitBalance: formatString(infrastructureAccountDto.debitBalance, infrastructureAccountDto.currencyDecimals),
		timestampLastJournalEntry: infrastructureAccountDto.timestampLastJournalEntry
	};
}

// TODO: change name.
export function infrastructureJournalEntryDtoToPublicTypesJournalEntryDto(
	infrastructureJournalEntryDto: IInfrastructureJournalEntryDto
): IJournalEntryDto {
	return {
		id: infrastructureJournalEntryDto.id,
		externalId: infrastructureJournalEntryDto.externalId,
		externalCategory: infrastructureJournalEntryDto.externalCategory,
		currencyCode: infrastructureJournalEntryDto.currencyCode,
		amount: formatString(infrastructureJournalEntryDto.amount, infrastructureJournalEntryDto.currencyDecimals),
		creditedAccountId: infrastructureJournalEntryDto.creditedAccountId,
		debitedAccountId: infrastructureJournalEntryDto.debitedAccountId,
		timestamp: infrastructureJournalEntryDto.timestamp
	};
}
