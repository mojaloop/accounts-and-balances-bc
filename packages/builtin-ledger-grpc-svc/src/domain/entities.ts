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

import {AnbAccountState, AnbAccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {bigintToString} from "./converters";

export type CreatedIdMapResponse = {
	requestedId:string;
	attributedId: string
}

// // Used for external comms - using strings
export class BuiltinLedgerAccountDto {
	id: string;
	state: AnbAccountState;
	//type: AnbAccountType;
	currencyCode: string;

	postedDebitBalance: string;
	postedCreditBalance: string;
	pendingDebitBalance: string;
	pendingCreditBalance: string;
    balance: string;
	// debitBalance: string | null;
	// creditBalance: string | null;

	timestampLastJournalEntry?: number;

    static fromBuiltinLedgerAccount(builtinLedgerAccount:BuiltinLedgerAccount):BuiltinLedgerAccountDto{
        const ret = new BuiltinLedgerAccountDto();
        ret.id =  builtinLedgerAccount.id;
        ret.state = builtinLedgerAccount.state;
        // ret.type = builtinLedgerAccount.type;
        ret.currencyCode = builtinLedgerAccount.currencyCode;

        ret.postedDebitBalance = bigintToString(builtinLedgerAccount.postedDebitBalance, builtinLedgerAccount.currencyDecimals);
        ret.pendingDebitBalance = bigintToString(builtinLedgerAccount.pendingDebitBalance, builtinLedgerAccount.currencyDecimals);
        ret.postedCreditBalance = bigintToString(builtinLedgerAccount.postedCreditBalance, builtinLedgerAccount.currencyDecimals);
        ret.pendingCreditBalance = bigintToString(builtinLedgerAccount.pendingCreditBalance, builtinLedgerAccount.currencyDecimals);
        ret.timestampLastJournalEntry = builtinLedgerAccount.timestampLastJournalEntry || undefined;

        const balance = builtinLedgerAccount.postedCreditBalance - builtinLedgerAccount.postedDebitBalance;
        ret.balance = bigintToString(balance , builtinLedgerAccount.currencyDecimals)

        return ret;
    }
}


/*export type LimitCheckMode =
	"NONE"
	| "DEBITS_CANNOT_EXCEED_CREDITS"
	| "CREDITS_CANNOT_EXCEED_DEBITS";
*/

// internal structure with integers
export type BuiltinLedgerAccount = {
	id: string;
	state: AnbAccountState;
	//type: AnbAccountType;
	// limitCheckMode: LimitCheckMode;
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

// Used for external comms
export type BuiltinLedgerJournalEntryDto = {
	id: string | null;
	ownerId: string | null;
	currencyCode: string;
	amount: string;
	pending: boolean;							// use pending balances instead of posted balances
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number | null;                 // TODO change to timestamp in microseconds (ms with 3 decimal places), using performance.timeOrigin +performance.now()
};

// internal structure with integers
export type BuiltinLedgerJournalEntry = {
	id?: string;                                // unefined when creating, valid when reading
	ownerId: string | null;
	currencyCode: string;
	currencyDecimals: number;
	amount: bigint;
	pending: boolean;							// use pending balances instead of posted balances
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number;                        // TODO change to timestamp in microseconds (ms with 3 decimal places), using performance.timeOrigin +performance.now()
};
