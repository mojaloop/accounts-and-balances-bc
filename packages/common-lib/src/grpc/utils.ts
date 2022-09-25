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
	IAccount,
	IJournalEntry,
	AccountState,
	AccountType
} from "../generic/types";
import {GrpcAccount__Output} from "./types/GrpcAccount";
import {GrpcJournalEntry__Output} from "./types/GrpcJournalEntry";
import {loadSync, PackageDefinition} from "@grpc/proto-loader";

// TODO: relative path.
const PROTO_FILE_PATH: string = "/home/goncalogarcia/Documents/Work/Mojaloop/vNext/BoundedContexts/accounts-and-balances-bc/packages/common-lib/src/grpc/accounts_and_balances.proto";

export function loadProto(): PackageDefinition {
	return loadSync(
		PROTO_FILE_PATH,
		{
			longs: String,
			enums: String,
			defaults: true
		}
	);
}

export function grpcAccountToIAccount(grpcAccount: GrpcAccount__Output): IAccount {
	const timestampLastJournalEntry: bigint = BigInt(grpcAccount.timestampLastJournalEntry);
	if (timestampLastJournalEntry > Number.MAX_SAFE_INTEGER) {
		throw new Error(); // TODO: create type.
	}
	return {
		id: grpcAccount.id,
		externalId: grpcAccount.externalId || null,
		state: grpcAccount.state as AccountState,
		type: grpcAccount.type as AccountType,
		currency: grpcAccount.currency,
		creditBalance: BigInt(grpcAccount.creditBalance),
		debitBalance: BigInt(grpcAccount.debitBalance),
		timestampLastJournalEntry: parseInt(grpcAccount.timestampLastJournalEntry)
	}
}

export function IAccountToGrpcAccount(domainAccount: IAccount): GrpcAccount__Output {
	return {
		id: domainAccount.id,
		externalId: domainAccount.externalId || "",
		state: domainAccount.state,
		type: domainAccount.type,
		currency: domainAccount.currency,
		creditBalance: domainAccount.creditBalance.toString(),
		debitBalance: domainAccount.debitBalance.toString(),
		timestampLastJournalEntry: domainAccount.timestampLastJournalEntry.toString()
	}
}

export function grpcJournalEntryToIJournalEntry(grpcJournalEntry: GrpcJournalEntry__Output): IJournalEntry {
	const timestamp: bigint = BigInt(grpcJournalEntry.timestamp);
	if (timestamp > Number.MAX_SAFE_INTEGER) {
		throw new Error(); // TODO: create type.
	}
	return {
		id: grpcJournalEntry.id,
		externalId: grpcJournalEntry.externalId || null,
		externalCategory: grpcJournalEntry.externalCategory || null,
		currency: grpcJournalEntry.currency,
		amount: BigInt(grpcJournalEntry.amount),
		creditedAccountId: grpcJournalEntry.creditedAccountId,
		debitedAccountId: grpcJournalEntry.debitedAccountId,
		timestamp: parseInt(grpcJournalEntry.timestamp)
	}
}

export function IJournalEntryToGrpcJournalEntry(domainJournalEntry: IJournalEntry): GrpcJournalEntry__Output {
	return {
		id: domainJournalEntry.id,
		externalId: domainJournalEntry.externalId || "",
		externalCategory: domainJournalEntry.externalId || "",
		currency: domainJournalEntry.currency,
		amount: domainJournalEntry.amount.toString(),
		creditedAccountId: domainJournalEntry.creditedAccountId.toString(),
		debitedAccountId: domainJournalEntry.debitedAccountId.toString(),
		timestamp: domainJournalEntry.timestamp.toString()
	}
}
