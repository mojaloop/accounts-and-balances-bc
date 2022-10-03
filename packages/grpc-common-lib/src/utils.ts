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

import {GrpcAccount__Output} from "./types/GrpcAccount";
import {GrpcJournalEntry__Output} from "./types/GrpcJournalEntry";
import {loadSync, PackageDefinition} from "@grpc/proto-loader";
import {join} from "path";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const PROTO_FILE_NAME: string = "accounts_and_balances.proto";

export function loadProto(): PackageDefinition {
	const protoFilePath: string = join(__dirname, PROTO_FILE_NAME);
	return loadSync(
		protoFilePath,
		{
			longs: Number,
			enums: String,
			defaults: false
		}
	);
}

export function grpcAccountToAccountDto(grpcAccount: GrpcAccount__Output): IAccountDto {
	const ret:IAccountDto = {
		id: grpcAccount.id || null,
		externalId: grpcAccount.externalId || null,
		state: grpcAccount.state as AccountState,
		type: grpcAccount.type as AccountType,
		currencyCode: grpcAccount.currencyCode!,
		creditBalance: grpcAccount.creditBalance!,
		debitBalance: grpcAccount.debitBalance!,
		timestampLastJournalEntry: null
	};

	return ret;
}

export function accountDtoToGrpcAccount(accountDto: IAccountDto): GrpcAccount__Output {
	const ret:GrpcAccount__Output = {
		id: accountDto.id || undefined,
		externalId: accountDto.externalId || undefined,
		state: accountDto.state,
		type: accountDto.type,
		currencyCode: accountDto.currencyCode,
		creditBalance: accountDto.creditBalance,
		debitBalance: accountDto.debitBalance,
		timestampLastJournalEntry: accountDto.timestampLastJournalEntry || undefined
	};

	return ret;
}

export function grpcJournalEntryToJournalEntryDto(grpcJournalEntry: GrpcJournalEntry__Output): IJournalEntryDto {
	const ret:IJournalEntryDto = {
		id: grpcJournalEntry.id || null,
		externalId: grpcJournalEntry.externalId || null,
		externalCategory: grpcJournalEntry.externalCategory || null,
		currencyCode: grpcJournalEntry.currencyCode!,
		amount: grpcJournalEntry.amount!,
		creditedAccountId: grpcJournalEntry.creditedAccountId!,
		debitedAccountId: grpcJournalEntry.debitedAccountId!,
		timestamp: grpcJournalEntry.timestamp || null
	};

	return ret;
}

export function journalEntryDtoToGrpcJournalEntry(journalEntryDto: IJournalEntryDto): GrpcJournalEntry__Output {
	const ret:GrpcJournalEntry__Output = {
		id: journalEntryDto.id || undefined,
		externalId: journalEntryDto.externalId || undefined,
		externalCategory: journalEntryDto.externalId || undefined,
		currencyCode: journalEntryDto.currencyCode,
		amount: journalEntryDto.amount,
		creditedAccountId: journalEntryDto.creditedAccountId,
		debitedAccountId: journalEntryDto.debitedAccountId,
		timestamp: journalEntryDto.timestamp || undefined
	};

	return ret
}
