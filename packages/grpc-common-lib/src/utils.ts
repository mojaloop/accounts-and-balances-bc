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

import {GrpcAccount, GrpcAccount__Output} from "./types/GrpcAccount";
import {GrpcJournalEntry, GrpcJournalEntry__Output} from "./types/GrpcJournalEntry";
import {loadSync, Options, PackageDefinition} from "@grpc/proto-loader";
import {join} from "path";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const PROTO_FILE_NAME: string = "accounts_and_balances.proto";
const LOAD_PROTO_OPTIONS: Options = {
	longs: Number
};

export function loadProto(): PackageDefinition {
	const protoFileAbsolutePath: string = join(__dirname, PROTO_FILE_NAME);
	const packageDefinition: PackageDefinition = loadSync(protoFileAbsolutePath, LOAD_PROTO_OPTIONS);
	return packageDefinition;
}

export function accountDtoToGrpcAccount(accountDto: IAccountDto): GrpcAccount {
	const grpcAccount: GrpcAccount = {
		id: accountDto.id ?? undefined,
		externalId: accountDto.externalId ?? undefined,
		state: accountDto.state,
		type: accountDto.type,
		currencyCode: accountDto.currencyCode,
		currencyDecimals: accountDto.currencyDecimals ?? undefined,
		debitBalance: accountDto.debitBalance,
		creditBalance: accountDto.creditBalance,
		timestampLastJournalEntry: accountDto.timestampLastJournalEntry ?? undefined
	};
	return grpcAccount;
}

export function grpcAccountOutputToAccountDto(grpcAccountOutput: GrpcAccount__Output): IAccountDto {
	if (
		grpcAccountOutput.state === undefined
		|| grpcAccountOutput.type === undefined
		|| grpcAccountOutput.currencyCode === undefined
		|| grpcAccountOutput.debitBalance === undefined
		|| grpcAccountOutput.creditBalance === undefined
	) {
		throw new Error(); // TODO: message?
	}

	const accountDto: IAccountDto = {
		id: grpcAccountOutput.id ?? null,
		externalId: grpcAccountOutput.externalId ?? null,
		state: grpcAccountOutput.state as AccountState,
		type: grpcAccountOutput.type as AccountType,
		currencyCode: grpcAccountOutput.currencyCode,
		currencyDecimals: grpcAccountOutput.currencyDecimals ?? null,
		debitBalance: grpcAccountOutput.debitBalance,
		creditBalance: grpcAccountOutput.creditBalance,
		timestampLastJournalEntry: grpcAccountOutput.timestampLastJournalEntry ?? null
	};
	return accountDto;
}

export function journalEntryDtoToGrpcJournalEntry(journalEntryDto: IJournalEntryDto): GrpcJournalEntry {
	const grpcJournalEntry: GrpcJournalEntry = {
		id: journalEntryDto.id ?? undefined,
		externalId: journalEntryDto.externalId ?? undefined,
		externalCategory: journalEntryDto.externalId ?? undefined,
		currencyCode: journalEntryDto.currencyCode,
		currencyDecimals: journalEntryDto.currencyDecimals ?? undefined,
		amount: journalEntryDto.amount,
		debitedAccountId: journalEntryDto.debitedAccountId,
		creditedAccountId: journalEntryDto.creditedAccountId,
		timestamp: journalEntryDto.timestamp ?? undefined
	};
	return grpcJournalEntry;
}

export function grpcJournalEntryOutputToJournalEntryDto(
	grpcJournalEntryOutput: GrpcJournalEntry__Output
): IJournalEntryDto {
	if (
		grpcJournalEntryOutput.currencyCode === undefined
		|| grpcJournalEntryOutput.amount === undefined
		|| grpcJournalEntryOutput.debitedAccountId === undefined
		|| grpcJournalEntryOutput.creditedAccountId === undefined
	) {
		throw new Error(); // TODO: message?
	}

	const journalEntryDto: IJournalEntryDto = {
		id: grpcJournalEntryOutput.id ?? null,
		externalId: grpcJournalEntryOutput.externalId ?? null,
		externalCategory: grpcJournalEntryOutput.externalCategory ?? null,
		currencyCode: grpcJournalEntryOutput.currencyCode,
		currencyDecimals: grpcJournalEntryOutput.currencyDecimals ?? null,
		amount: grpcJournalEntryOutput.amount,
		debitedAccountId: grpcJournalEntryOutput.debitedAccountId,
		creditedAccountId: grpcJournalEntryOutput.creditedAccountId,
		timestamp: grpcJournalEntryOutput.timestamp ?? null
	};
	return journalEntryDto;
}
