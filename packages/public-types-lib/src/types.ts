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

export const AnbAccountState = {
    ACTIVE: "ACTIVE",               // normal state, can add new entries
    INACTIVE: "INACTIVE",           // available for reads only, cannot add new entries
    DELETED: "DELETED"              // not available to reads or writes, historic only (can be changed back to inactive)
} as const;
export type AnbAccountState = keyof typeof AnbAccountState;

export const AnbAccountType = {
    POSITION: "POSITION",                           // participant position account
    LIQUIDITY: "LIQUIDITY",                         // participant liquidity account
    TIGERBEETLE_CONTROL: "TIGERBEETLE_CONTROL",     // tigerBeetle control account (for lookup-less liquidity check)
    SETTLEMENT: "SETTLEMENT",                       // per batch/participant settlement account
    HUB_RECONCILIATION: "HUB_RECONCILIATION",       // hub joke account (counterpart to participant liquidity accounts)
    HUB_TMP_CONTROL: "HUB_TMP_CONTROL"              // hub tmp account (counterpart to participant control accounts)
} as const;
export type AnbAccountType = keyof typeof AnbAccountType;

/*
* Accounts
* */

// Represents an existing account, use IAnbCreateAccountRequest to create accounts use IAnbCreateAccountRequest
export interface IAnbAccount {
	id: string;                                     // account id in accounts and balances (not the possibly different external ledger account id)
	ownerId: string | null;                         // optional owner id
	state: AnbAccountState;
	type: AnbAccountType;
	currencyCode: string;                           // 3 letter (alphabetic) iso 4217 code // TODO consider changing to struct
    pendingDebitBalance: string;                    // pending debit value - only increases - string in currency format
    postedDebitBalance: string;                     // posted debit value - only increases - string in currency format
    pendingCreditBalance: string;                   // pending credit value - only increases - string in currency format
    postedCreditBalance: string;                    // posted credit value - only increases - string in currency format
	balance: string;                                // posted balance - string in currency format
	timestampLastJournalEntry: number | null;       // null if no entries exist yet
}


export interface IAnbCreateAccountRequest {
    requestedId: string | null;
    ownerId: string;
    type: AnbAccountType;
    currencyCode: string;
    // currencyNum: string;
}

/*
* Entries
* */

// Represents an existing journal entry, use IAnbCreateAccountRequest to create use IAnbCreateJournalEntryRequest
export interface IAnbJournalEntry{
	id: string;
	ownerId: string | null;
	currencyCode: string;
	amount: string;
	pending: boolean;
	debitedAccountId: string;
	creditedAccountId: string;
	timestamp: number;
}

export interface IAnbCreateJournalEntryRequest {
    requestedId: string | null;
    ownerId: string | null;
    currencyCode: string;
    amount: string;
    pending: boolean;
    debitedAccountId: string;
    creditedAccountId: string;
}


/*
* High level batch requests
* */

export type IAnbHighLevelRequest =
    IAnbCheckLiquidAndReserveRequest | IAnbCancelReservationAndCommitRequest | IAnbCancelReservationRequest;

// we want to keep these small in the write, so a number enum is efficient
export declare const enum AnbHighLevelRequestTypes {
    checkLiquidAndReserve = 0,
    cancelReservationAndCommit = 1,
    cancelReservation = 2
}

export interface IAnbHighLevelCommonRequest {
    requestType: AnbHighLevelRequestTypes;
    requestId: string;
    transferId: string;
    payerPositionAccountId: string;
    hubJokeAccountId: string;
    transferAmount: string;
    currencyCode: string;

    // required for lookup-less TigerBeetle mode
    payerControlAccountId: string | null;       // control account that reflects sum of FSP liq and pos balances
    hubTmpControlAccountId: string | null;     // 2nd hub tmp account to use for the test liq transfers
}

export interface IAnbHighLevelResponse {
    requestType: AnbHighLevelRequestTypes;
    requestId: string;
    success: boolean;
    errorMessage: string | null;
}

export interface IAnbCheckLiquidAndReserveRequest extends IAnbHighLevelCommonRequest{
    payerLiquidityAccountId: string; // only for checkLiquidAndReserve
    payerNetDebitCap: string;        // only for checkLiquidAndReserve
}

export interface IAnbCancelReservationAndCommitRequest extends IAnbHighLevelCommonRequest{
    payeePositionAccountId: string;  // only for cancelReservationAndCommit

    // required for lookup-less TigerBeetle mode
    payeeControlAccountId: string | null;   // control account that reflects sum of FSP liq and pos balances
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAnbCancelReservationRequest extends IAnbHighLevelCommonRequest{
    // no specific fields
}


/*
* Other
* */
export interface IAnbCreateResponse {
    requestedId: string | null;
    attributedId: string;
}

export interface IAnbGrpcCertificatesFiles {
    caCertFilePath: string;
    privateKeyFilePath:string;
    certChainFilePath:string;
}
