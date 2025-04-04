/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use strict";

import {AccountsAndBalancesAccountState, AccountsAndBalancesAccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";



export type CreatedIdMapResponse = {
	requestedId:string;
	attributedId: string
}

export type BuiltinLedgerAccountDto = {
	id: string | null;
	state: AccountsAndBalancesAccountState;
	type: AccountsAndBalancesAccountType;
	currencyCode: string;

	postedDebitBalance: string | null;
	postedCreditBalance: string | null;
	pendingDebitBalance: string | null;
	pendingCreditBalance: string | null;

	// debitBalance: string | null;
	// creditBalance: string | null;
	timestampLastJournalEntry: number | null;
};

// TODO: find a better name.
export type LimitCheckMode =
	"NONE"
	| "DEBITS_CANNOT_EXCEED_CREDITS"
	| "CREDITS_CANNOT_EXCEED_DEBITS";

export type BuiltinLedgerAccount = {
	id: string;
	state: AccountsAndBalancesAccountState;
	type: AccountsAndBalancesAccountType;
	limitCheckMode: LimitCheckMode;
	currencyCode: string;
	currencyDecimals: number;

	postedDebitBalance: bigint;
	postedCreditBalance: bigint;
	pendingDebitBalance: bigint;
	pendingCreditBalance: bigint;

	// debitBalance: bigint;
	// creditBalance: bigint;
	timestampLastJournalEntry: number | null;
};

export type BuiltinLedgerJournalEntryDto = {
	id: string | null;
	ownerId: string | null;
	currencyCode: string;
	amount: string;
	pending: boolean;							// use pending balances instead of posted balances
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
	pending: boolean;							// use pending balances instead of posted balances
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number;
};
