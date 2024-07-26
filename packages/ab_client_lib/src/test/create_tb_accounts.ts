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

import * as TB from "tigerbeetle-node";
import console from "console";
import {randomUUID} from "crypto";

import {
    hubJokeAccountId as hubJokeAccountId_GUID,
    payeePositionAccountId as payeePositionAccountId_GUID,
    payerLiquidityAccountId as payerLiquidityAccountId_GUID,
    payerPosAccountId as payerPosAccountId_GUID
} from "./common";

// should match the other test file
const ledgerID = 978; //EUR code;
const code = 1;

// const hubJokeAccountId = uuidToBigint(hubJokeAccountId_GUID);
// const payerPosAccountId = uuidToBigint(payerPosAccountId_GUID);
// const payerLiquidityAccountId = uuidToBigint(payerLiquidityAccountId_GUID);
// const payeePositionAccountId = uuidToBigint(payeePositionAccountId_GUID);


const hubJokeAccountId = 1n;
const hubControlAccountId = 5n;

const payerPosAccountId = 1001n;
const payerLiquidityAccountId = 1002n;
const payerControlAccountId = 1005n;

const payeePosAccountId = 2001n;
const payeeLiquidityAccountId = 2002n;
const payeeControlAccountId = 2005n;

const start = async ()=> {

    const client = TB.createClient({
        cluster_id: 0n,
        replica_addresses: ["13000"],
    });

    const createAccountRequests: TB.Account[] = [];
    // hub accounts
    console.debug(`Creating hubJokeAccountId with id: ${hubJokeAccountId}`);
    createAccountRequests.push(getTbCreateAccountReq(hubJokeAccountId));
    console.debug(`Creating hubControlAccountId with id: ${hubControlAccountId}`);
    createAccountRequests.push(getTbCreateAccountReq(hubControlAccountId));

    // payer accounts
    console.debug(`Creating payerPosAccountId with id: ${payerPosAccountId}`);
    createAccountRequests.push(getTbCreateAccountReq(payerPosAccountId));
    console.debug(`Creating payerLiquidityAccountId with id: ${payerLiquidityAccountId}`);
    createAccountRequests.push(getTbCreateAccountReq(payerLiquidityAccountId));

    console.debug(`Creating payerControlAccountId with id: ${payerControlAccountId}`);
    createAccountRequests.push(getTbCreateControlAccountReq(payerControlAccountId));

    // payee accounts
    console.debug(`Creating payeePosAccountId with id: ${payeePosAccountId}`);
    createAccountRequests.push(getTbCreateAccountReq(payeePosAccountId));
    console.debug(`Creating payeeLiquidityAccountId with id: ${payeeLiquidityAccountId}`);
    createAccountRequests.push(getTbCreateAccountReq(payeeLiquidityAccountId));

    console.debug(`Creating payeeControlAccountId with id: ${payeeControlAccountId}`);
    createAccountRequests.push(getTbCreateControlAccountReq(payeeControlAccountId));

    const createAccountsResp = await client.createAccounts(createAccountRequests);
    console.log(createAccountsResp);

    const transferRequests: TB.Transfer[] = [];
    console.debug("depositing to payerLiquidityAccountId from hubJokeAccountId");
    transferRequests.push(getTbCreateFundsInTransferReq(hubJokeAccountId, payerLiquidityAccountId));
    console.debug("depositing to payerControlAccountId from hubControlAccountId");
    transferRequests.push(getTbCreateFundsInTransferReq(hubControlAccountId, payerControlAccountId));

    const createTransfersResp = await client.createTransfers(transferRequests);
    console.log(createTransfersResp);

    return Promise.resolve();
};

start().then(()=>{
    console.log("done");
});


function getTbCreateFundsInTransferReq(debitAccount:bigint, creditAccount:bigint){
    return {
        id: uuidToBigint(randomUUID()), // u128
        debit_account_id: debitAccount,  // u128
        credit_account_id: creditAccount, // u128
        amount: 9999999999999n, // u64
        pending_id: 0n, // u128
        user_data_128: 0n, // u128
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0, // u64, in nano-seconds.
        ledger: ledgerID,  // u32, ledger for transfer (e.g. currency).
        code: code,  // u16,
        flags: TB.TransferFlags.none, // u16
        timestamp: 0n, //u64, Reserved: This will be set by the server.
    };
}


function getTbCreateAccountReq(accountId:bigint){
    return {
        id: accountId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: ledgerID,
        code: code,
        flags: 0,
        timestamp: 0n,
    };
}

function getTbCreateControlAccountReq(accountId:bigint){
    return {
        id: accountId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: ledgerID,
        code: code,
        flags: TB.AccountFlags.debits_must_not_exceed_credits,
        timestamp: 0n,
    };
}

// inspired from https://stackoverflow.com/a/53751162/5743904
function uuidToBigint(uuid: string) : bigint {
    // let hex = uuid.replaceAll("-",""); // replaceAll only works on es2021
    let hex = uuid.replace(/-/g, "");
    if (hex.length % 2) {
        hex = "0" + hex;
    }
    const bi = BigInt("0x" + hex);
    return bi;
}

function bigIntToUuid(bi: bigint): string {
    let str = bi.toString(16);
    while (str.length < 32) str = "0"+str;

    if (str.length !== 32) {
        console.warn(`_bigIntToUuid() got string that is not 32 chars long: "${str}"`);
    } else {
        str = str.substring(0, 8)+"-"+str.substring(8, 12)+"-"+str.substring(12, 16)+"-"+str.substring(16, 20)+"-"+str.substring(20);
    }
    return str;
}
