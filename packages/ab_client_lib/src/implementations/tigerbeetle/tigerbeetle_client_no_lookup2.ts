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

 * Interledger Foundation
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/

"use strict";

import {randomUUID} from "crypto";
import * as TB from "tigerbeetle-node";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

import {
    AccountsAndBalancesError,
    IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbHighLevelRequest
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";


import {getCurrencyOrThrow, stringToBigint} from "../../utils";

import {IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {TigerBeetleUtils} from "./tigerbeetle_utils";
import {TigerBeetleDataPlaneClient} from "./tigerbeetle_client";

export class TigerBeetleDataPlaneClient_NoLookup2 extends TigerBeetleDataPlaneClient {
    protected _tbLookupLessMode = true;

    constructor(
        clusterId: number,
        replicaAddresses: string,
        currencies:Currency[],
        logger: ILogger,
        metrics:IMetrics
    ) {
        super(clusterId, replicaAddresses, currencies, logger, metrics);
        this._logger.info()
    }

    protected override async _getTbTransfersFor_checkLiquidAndReserve(req:IAnbHighLevelRequest, tmpAccounts:TB.Account[]):Promise<{tbTransfs:TB.Transfer[], success:boolean, errorMsg?:string}>{
        const timerEndFn = this._histo.startTimer({callName: "_getTbTransfersFor_checkLiquidAndReserve"});
        const specificReq = req as IAnbCheckLiquidAndReserveRequest;

        // get currency
        const currency = getCurrencyOrThrow(this._currencies, specificReq.currencyCode);
        // common checks
        this._validateCommonFieldsInHighLevelRequestOrThrow(specificReq, currency);
        // specific checks
        this._checkValidAccountIdOrThrow(specificReq.payerLiquidityAccountId, "Invalid payerLiquidityAccountId in checkLiquidAndReserve IAnbHighLevelRequest");
        if(specificReq.payerNetDebitCap === undefined || specificReq.payerNetDebitCap === null) {
            timerEndFn({success: "false"});
            return {tbTransfs:[], success: false, errorMsg: "Invalid payerNetDebitCap in checkLiquidAndReserve IAnbHighLevelRequest"};
        }

        const transferId = TigerBeetleUtils.uuidToBigint(specificReq.transferId);
        const amount = stringToBigint(specificReq.transferAmount, currency.decimals);
        const payerNetDebitCap = stringToBigint(specificReq.payerNetDebitCap, currency.decimals);
        const ledgerId = parseInt(currency.num);
        const payerPositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerPositionAccountId);
        const hubJokeAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.hubJokeAccountId);
        // not needed in no-lookup TB mode
        //const payerLiquidityAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerLiquidityAccountId); // was checked above

        const amountWithNdc:bigint = amount + payerNetDebitCap;

        // get payer control and hub tmp control accounts for lookup-less TB mode
        if(!specificReq.payerControlAccountId || !specificReq.hubTmpControlAccountId){
            timerEndFn({success: "false"});
            const msg = `Could not find payer control or hub tmp control accounts in TigerBeetle NoLookup client for transfer with Id: ${specificReq.transferId}`;
            this._logger.warn(msg);
            return {tbTransfs:[], success: false, errorMsg: msg};
        }
        const payerControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerControlAccountId);
        const hubTmpControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.hubTmpControlAccountId);

        /* Create the 2 linked transfers
            payerControlAccountId -> hubTmpControlAccountId - linked using amountWithNdc (test transf - will fail if liq check fails + reflect reservation in ctrl acc)
            reverse the transfer above
            payerPositionAccountId -> hubJokeAccountId - pending + linked - actual position reservation - with only the transfer amount
            payerControlAccountId -> hubTmpControlAccountId - posted + linked - ctrl reservation with only the transfer amount
        */

        const tbTransfs:TB.Transfer[] = [{
            // execute a test transfer of amount+ntc from the payer control account
            id: TigerBeetleUtils.uuidToBigint(randomUUID()), // u128
            debit_account_id: payerControlAccountId,  // u128
            credit_account_id: hubTmpControlAccountId, // u128
            amount: amountWithNdc, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16,
            flags: TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            // reverse this because the first transfer was using the amountWithNdc
            id: TigerBeetleUtils.uuidToBigint(randomUUID()), // u128
            debit_account_id: hubTmpControlAccountId,  // u128
            credit_account_id: payerControlAccountId, // u128
            amount: amountWithNdc, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16,
            flags: TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            // reserve transfer amount (from payer pos account) - using the transfer id as the tb transfer id
            id: transferId, // u128
            debit_account_id: payerPositionAccountId,  // u128
            credit_account_id: hubJokeAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16,
            flags: TB.TransferFlags.pending | TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            // payerControlAccountId -> hubTmpControlAccountId - posted + linked - ctrl reservation with only the transfer amount
            id: TigerBeetleUtils.uuidToBigint(randomUUID()), // u128
            debit_account_id: payerControlAccountId,  // u128
            credit_account_id: hubTmpControlAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16,
            flags: TB.TransferFlags.none, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        }];

        timerEndFn({success: "true"});
        return {tbTransfs: tbTransfs, success: true};
    }

    protected override async _getTbTransfersFor_cancelReservationAndCommit(req:IAnbHighLevelRequest):Promise<{tbTransfs:TB.Transfer[], success:boolean, errorMsg?:string}>{
        const timerEndFn = this._histo.startTimer({callName: "_getTbTransfersFor_cancelReservationAndCommit"});
        const specificReq = req as IAnbCancelReservationAndCommitRequest;

        // get currency
        const currency = getCurrencyOrThrow(this._currencies, specificReq.currencyCode);
        // common checks
        this._validateCommonFieldsInHighLevelRequestOrThrow(specificReq, currency);
        // specific checks
        if(specificReq.payeePositionAccountId === undefined || specificReq.payeePositionAccountId === null) {
            throw new AccountsAndBalancesError("Invalid payeePositionAccountId in cancelReservationAndCommit IAnbHighLevelRequest");
        }

        // first in the chain, dont' care about its id
        const cancelTransferId  = TigerBeetleUtils.uuidToBigint(randomUUID());
        // this is the last in the chain, so it gets the requestI
        const commitTransferId  =  TigerBeetleUtils.uuidToBigint(randomUUID());
        const transferId = TigerBeetleUtils.uuidToBigint(specificReq.transferId);
        const amount = stringToBigint(specificReq.transferAmount, currency.decimals);
        const ledgerId = parseInt(currency.num);
        const payerPositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerPositionAccountId);
        const payeePositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payeePositionAccountId);
        const hubJokeAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.hubJokeAccountId);

        // get payer control and hub tmp control accounts for lookup-less TB mode
        if(!specificReq.payerControlAccountId || !specificReq.hubTmpControlAccountId || !specificReq.payeeControlAccountId){
            timerEndFn({success: "false"});
            const msg = `Could not find payer control, payee control or hub tmp control accounts in TigerBeetle NoLookup client for transfer with Id: ${specificReq.transferId}`;
            this._logger.warn(msg);
            return {tbTransfs:[], success: false, errorMsg: msg};
        }
        const payerControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payerControlAccountId);
        const hubTmpControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.hubTmpControlAccountId);
        const payeeControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(specificReq.payeeControlAccountId);

        /* Create the 4 linked transfers
            reverse the reservation in ctrl account
            void the pending on position
            transfer funds from payer pos to payee pos
            transfer funds from payer ctrl to payee ctrl

            // OLD BELOW
            hubJokeAccountId -> payerPositionAccountId - pending + linked (revert reservation)
            hubTmpControlAccountId -> payerControlAccountId - pending + linked (revert reservation in ctrl acc)
            payerPositionAccountId -> payeePositionAccountId - linked (move funds from payer to payee positions accounts)
            payerControlAccountId -> payeeControlAccountId - linked (move funds from payer to payee control accounts)
        */

        const tbTransfs:TB.Transfer[] = [{
            // reverse reservation in ctrl account
            id: TigerBeetleUtils.uuidToBigint(randomUUID()),
            debit_account_id: hubTmpControlAccountId,  // u128
            credit_account_id: payerControlAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            // void the pending in payer pos
            id: TigerBeetleUtils.uuidToBigint(randomUUID()),
            debit_account_id: 0n,  // u128
            credit_account_id: 0n, // u128
            amount: 0n, // u64
            pending_id: transferId, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: 0,  // u32, ledger for transfer (e.g. currency).
            code: 0,  // u16, //TODO confirm
            flags: TB.TransferFlags.void_pending_transfer | TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            // transfer funds from payer pos to payee pos
            id: TigerBeetleUtils.uuidToBigint(randomUUID()),
            debit_account_id: payerPositionAccountId,  // u128
            credit_account_id: payeePositionAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            // transfer funds from payer ctrl to payee ctrl
            id: TigerBeetleUtils.uuidToBigint(randomUUID()),
            debit_account_id: payerControlAccountId,  // u128
            credit_account_id: payeeControlAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.none, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        }
        ];

        timerEndFn({success: "true"});
        return {tbTransfs: tbTransfs, success: true};
    }

    protected override async _getTbTransfersFor_cancelReservation(req:IAnbHighLevelRequest):Promise<{tbTransfs:TB.Transfer[], success:boolean, errorMsg?:string}>{
        const timerEndFn = this._histo.startTimer({callName: "_getTbTransfersFor_cancelReservation"});
        // get currency
        const currency = getCurrencyOrThrow(this._currencies, req.currencyCode);
        // common checks
        this._validateCommonFieldsInHighLevelRequestOrThrow(req, currency);
        // no specific checks

        const cancelTransferId  = TigerBeetleUtils.uuidToBigint(randomUUID());
        const transferId = TigerBeetleUtils.uuidToBigint(req.transferId);
        const amount = stringToBigint(req.transferAmount, currency.decimals);
        const ledgerId = parseInt(currency.num);
        const payerPositionAccountId:bigint = TigerBeetleUtils.uuidToBigint(req.payerPositionAccountId);
        const hubJokeAccountId:bigint = TigerBeetleUtils.uuidToBigint(req.hubJokeAccountId);

        // get payer control and hub tmp control accounts for lookup-less TB mode
        if(!req.payerControlAccountId || !req.hubTmpControlAccountId){
            timerEndFn({success: "false"});
            const msg = `Could not find payer control or hub tmp control accounts in TigerBeetle NoLookup client for transfer with Id: ${req.transferId}`;
            this._logger.warn(msg);
            return {tbTransfs:[], success: false, errorMsg: msg};
        }
        const payerControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(req.payerControlAccountId);
        const hubTmpControlAccountId:bigint = TigerBeetleUtils.uuidToBigint(req.hubTmpControlAccountId);

        const cancelTbTransfers: TB.Transfer[] = [{
            id: cancelTransferId,
            debit_account_id: hubJokeAccountId,  // u128
            credit_account_id: payerPositionAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.pending | TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        },{
            id: cancelTransferId,
            debit_account_id: hubTmpControlAccountId,  // u128
            credit_account_id: payerControlAccountId, // u128
            amount: amount, // u64
            pending_id: 0n, // u128
            user_data_128: transferId, // u128
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0, // u64, in nano-seconds.
            ledger: ledgerId,  // u32, ledger for transfer (e.g. currency).
            code: 1,  // u16, //TODO confirm
            flags: TB.TransferFlags.pending | TB.TransferFlags.linked, // u16
            timestamp: 0n, //u64, Reserved: This will be set by the server.
        }];

        timerEndFn({success: "true"});
        return {tbTransfs: cancelTbTransfers, success: true};
    }

}
