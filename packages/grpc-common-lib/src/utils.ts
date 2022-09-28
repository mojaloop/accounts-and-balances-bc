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
import * as path from "path";
import {
	AccountState,
	AccountType,
	IAccountDto,
	IJournalEntryDto
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const PROTO_FILE_NAME = "accounts_and_balances.proto";
const PROTO_FILE_PATH = path.join(__dirname, PROTO_FILE_NAME);

export function loadProto(): PackageDefinition {
	return loadSync(
		PROTO_FILE_PATH,
		{
			longs: Number,
			enums: String,
			defaults: true
		}
	);
}

export function grpcAccountToAccountDto(grpcAccount: GrpcAccount__Output): IAccountDto {
	return {
		id: grpcAccount.id,
		externalId: grpcAccount.externalId || null,
		state: grpcAccount.state as AccountState,
		type: grpcAccount.type as AccountType,
		currency: grpcAccount.currency,
		creditBalance: grpcAccount.creditBalance,
		debitBalance: grpcAccount.debitBalance,
		timestampLastJournalEntry: grpcAccount.timestampLastJournalEntry
	}
}

export function accountDtoToGrpcAccount(accountDto: IAccountDto): GrpcAccount__Output {
	return {
		id: accountDto.id,
		externalId: accountDto.externalId || "",
		state: accountDto.state,
		type: accountDto.type,
		currency: accountDto.currency,
		creditBalance: accountDto.creditBalance,
		debitBalance: accountDto.debitBalance,
		timestampLastJournalEntry: accountDto.timestampLastJournalEntry
	}
}

export function grpcJournalEntryToJournalEntryDto(grpcJournalEntry: GrpcJournalEntry__Output): IJournalEntryDto {
	return {
		id: grpcJournalEntry.id,
		externalId: grpcJournalEntry.externalId || null,
		externalCategory: grpcJournalEntry.externalCategory || null,
		currency: grpcJournalEntry.currency,
		amount: grpcJournalEntry.amount,
		creditedAccountId: grpcJournalEntry.creditedAccountId,
		debitedAccountId: grpcJournalEntry.debitedAccountId,
		timestamp: grpcJournalEntry.timestamp
	}
}

export function journalEntryDtoToGrpcJournalEntry(journalEntryDto: IJournalEntryDto): GrpcJournalEntry__Output {
	return {
		id: journalEntryDto.id,
		externalId: journalEntryDto.externalId || "",
		externalCategory: journalEntryDto.externalId || "",
		currency: journalEntryDto.currency,
		amount: journalEntryDto.amount,
		creditedAccountId: journalEntryDto.creditedAccountId,
		debitedAccountId: journalEntryDto.debitedAccountId,
		timestamp: journalEntryDto.timestamp
	}
}
