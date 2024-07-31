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
import {TigerBeetleUtils} from "../implementations/tigerbeetle/tigerbeetle_utils";
import {bigintToString} from "../utils";

// should match the other test file
const ledgerID = 978; //EUR code;
const code = 1;
const decimals = 2; // EUR

const hubJokeAccountId = "00000000-0000-0000-0000-000000000001";        // 1
const hubControlAccountId = "00000000-0000-0000-0000-000000000005";     // 5

const payerPosAccountId = "00000000-0000-0000-0000-000000001001";       // 4097
const payerLiquidityAccountId = "00000000-0000-0000-0000-000000001002"; // 4098
const payerControlAccountId = "00000000-0000-0000-0000-000000001005";   // 4101

const payeePosAccountId = "00000000-0000-0000-0000-000000002001";       // 8193
const payeeLiquidityAccountId = "00000000-0000-0000-0000-000000002002"; // 8194
const payeeControlAccountId = "00000000-0000-0000-0000-000000002005";   // 8197

const start = async ()=> {

    const client = TB.createClient({
        cluster_id: 0n,
        replica_addresses: ["13000"],
    });

    // while(true){
        await executeLookups(client);
        // await delay(5000);
    // }

    // const resp = await client.lookupTransfers([52164700239966177532209503749357130996n]);
    // const resp = await client.getAccountTransfers({
    //     account_id:4097n, limit: 10, flags: TB.AccountFilterFlags.debits,
    //     timestamp_min: 1n, timestamp_max: BigInt(2**63 - 1),
    // });
    // console.log(resp);

    return Promise.resolve();
};

start().then(()=>{
    console.log("done");
    process.exit(0);
});

// @ts-ignore
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function executeLookups(client: TB.Client):Promise<void> {
    const startTime = Date.now();

    console.log(`\t\t\tPending\t\t\tPosted `);
    console.log(`Account       \t\tdebits | credits  \tdebits | credits \t\tTB acc id`);
    console.log("-".repeat(100));

    const hubLookupRequests: TB.AccountID[] = [];
    // hub accounts
    hubLookupRequests.push(TigerBeetleUtils.uuidToBigint(hubJokeAccountId));
    hubLookupRequests.push(TigerBeetleUtils.uuidToBigint(hubControlAccountId));
    const hubAccountsResp = await client.lookupAccounts(hubLookupRequests);
    console.log(`Hub joke     \t\t${getSummary(hubAccountsResp[0])}\t\t\t${TigerBeetleUtils.uuidToBigint(hubJokeAccountId)}`);
    console.log(`Hub control  \t\t${getSummary(hubAccountsResp[1])}\t\t\t${TigerBeetleUtils.uuidToBigint(hubControlAccountId)}`);
    console.log();

    // payer
    const payerLookupRequests: TB.AccountID[] = [];
    payerLookupRequests.push(TigerBeetleUtils.uuidToBigint(payerPosAccountId));
    payerLookupRequests.push(TigerBeetleUtils.uuidToBigint(payerControlAccountId));
    payerLookupRequests.push(TigerBeetleUtils.uuidToBigint(payerLiquidityAccountId));
    const payerAccountsResp = await client.lookupAccounts(payerLookupRequests);
    console.log(`Payer pos    \t\t${getSummary(payerAccountsResp[0])}\t\t\t${TigerBeetleUtils.uuidToBigint(payerPosAccountId)}`);
    console.log(`Payer control\t\t${getSummary(payerAccountsResp[1])}\t\t\t${TigerBeetleUtils.uuidToBigint(payerControlAccountId)}`);
    console.log(`Payer liq    \t\t${getSummary(payerAccountsResp[2])}\t\t\t${TigerBeetleUtils.uuidToBigint(payerLiquidityAccountId)}`);
    console.log();

    // payee
    const payeeLookupRequests: TB.AccountID[] = [];
    payeeLookupRequests.push(TigerBeetleUtils.uuidToBigint(payeePosAccountId));
    payeeLookupRequests.push(TigerBeetleUtils.uuidToBigint(payeeControlAccountId));
    payeeLookupRequests.push(TigerBeetleUtils.uuidToBigint(payeeLiquidityAccountId));
    const payeeAccountsResp = await client.lookupAccounts(payeeLookupRequests);
    console.log(`Payee pos    \t\t${getSummary(payeeAccountsResp[0])}\t\t\t${TigerBeetleUtils.uuidToBigint(payeePosAccountId)}`);
    console.log(`Payee control\t\t${getSummary(payeeAccountsResp[1])}\t\t\t${TigerBeetleUtils.uuidToBigint(payeeControlAccountId)}`);
    console.log(`Payee liq    \t\t${getSummary(payeeAccountsResp[2])}\t\t\t${TigerBeetleUtils.uuidToBigint(payeeLiquidityAccountId)}`);
    console.log();

    console.log(`--- Lookups complete --- took: ${Date.now() - startTime} ms\n`);
    return Promise.resolve();
}

function getSummary(tbAcc:TB.Account):string{
    if(!tbAcc) return "(n/a)";
    const pendingDebits = pad(bigintToString(tbAcc.debits_pending, decimals), 4);
    const pendingCredits = pad(bigintToString(tbAcc.credits_pending, decimals), 4);
    const pendingBalance =  bigintToString((tbAcc.debits_pending - tbAcc.credits_pending), decimals);


    const postedDebits = pad(bigintToString(tbAcc.debits_posted, decimals), 4);
    const postedCredits = pad(bigintToString(tbAcc.credits_posted, decimals), 4);
    const postedBalance =  bigintToString((tbAcc.debits_posted - tbAcc.credits_posted), decimals);

    // return `pending: ${pendingDebits} - ${pendingCredits} = ${pendingBalance} \t\t posted:  ${postedDebits} - ${postedCredits} = ${postedBalance}`;
    return `${pendingDebits} | ${pendingCredits} (${pendingBalance}) \t\t${postedDebits} | ${postedCredits} (${postedBalance})`;
    // return `${pendingDebits} | ${pendingCredits}  \t\t${postedDebits} | ${postedCredits} `;
}


function pad(numStr:string, size:number):string {
    while (numStr.length < size) numStr = "0" + numStr;
    return numStr;
}
