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

import {AccountState, AccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

// TODO: does it make sense to have DTO and non-DTO types?

export type BuiltinLedgerAccountDto = {
	id: string | null;
	state: AccountState;
	type: AccountType;
	currencyCode: string;
	// TODO: currency decimals not needed, right?
	debitBalance: string | null;
	creditBalance: string | null;
	timestampLastJournalEntry: number | null;
};

// TODO: find a better name.
export type LimitCheckMode =
	"NONE"
	| "DEBITS_CANNOT_EXCEED_CREDITS"
	| "CREDITS_CANNOT_EXCEED_DEBITS";

export type BuiltinLedgerAccount = {
	id: string;
	state: AccountState;
	type: AccountType;
	limitCheckMode: LimitCheckMode;
	currencyCode: string;
	currencyDecimals: number;
	debitBalance: bigint;
	creditBalance: bigint;
	timestampLastJournalEntry: number | null;
};

export type BuiltinLedgerJournalEntryDto = {
	id: string | null;
	ownerId: string | null;
	currencyCode: string;
	// TODO: currency decimals not needed, right?
	amount: string;
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number | null;
};

export type BuiltinLedgerJournalEntry = {
	id: string;
	ownerId: string | null;
	currencyCode: string;
	currencyDecimals: number;
	amount: bigint;
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number;
};
