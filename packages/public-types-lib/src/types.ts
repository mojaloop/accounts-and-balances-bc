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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>
 - Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/
"use strict";


//TODO change types to interfaces

export type AccountsAndBalancesAccountState = "ACTIVE" | "DELETED" | "INACTIVE";

export type AccountsAndBalancesAccountType =
	"FEE" | "POSITION" | "SETTLEMENT" | "HUB_MULTILATERAL_SETTLEMENT" | "HUB_RECONCILIATION";

export type AccountsAndBalancesAccount = {
	id: string | null;
	ownerId: string;
	state: AccountsAndBalancesAccountState;
	type: AccountsAndBalancesAccountType;
	currencyCode: string;
	postedDebitBalance: string | null;
	pendingDebitBalance: string | null
	postedCreditBalance: string | null;
	pendingCreditBalance: string | null;
	balance: string | null;
	timestampLastJournalEntry: number | null;
}

export type AccountsAndBalancesJournalEntry = {
	id: string | null;
	ownerId: string | null;
	currencyCode: string;
	amount: string;
	pending: boolean;
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number | null;
}


/*
* High level batch requests
* */

export declare const enum AccountsBalancesHighLevelRequestTypes {
    checkLiquidAndReserve = 0,
    cancelReservationAndCommit = 1,
    cancelReservation = 2
}

export interface IAccountsBalancesHighLevelRequest {
    requestType: AccountsBalancesHighLevelRequestTypes;
    requestId: string;
    transferId: string;
    payerPositionAccountId: string;
    hubJokeAccountId: string;
    transferAmount: string;
    currencyCode: string;

    payerLiquidityAccountId: string | null; // only for checkLiquidAndReserve
    payeePositionAccountId: string | null;  // only for cancelReservationAndCommit
    payerNetDebitCap: string | null;        // only for checkLiquidAndReserve
}

export interface IAccountsBalancesHighLevelResponse {
    requestType: AccountsBalancesHighLevelRequestTypes;
    requestId: string;
    success: boolean;
    errorMessage: string | null;
}


/*
/!**
 * Type used to request the creation of an account by the CoA Service
 *!/
export type AccountsAndBalancesCreateAccountRequest = {
	requestedId: string | null;
	ownerId: string;
	type: AccountsAndBalancesAccountType;
	currencyCode: string;
}

export type AccountsAndBalancesJournalEntryRequest = {
	requestedId: string | null;
	ownerId: string | null;
	currencyCode: string;
	amount: string;
	pending: boolean;
	debitedAccountId: string;
	creditedAccountId: string;
}*/
