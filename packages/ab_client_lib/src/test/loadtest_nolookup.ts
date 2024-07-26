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

import console from "console";
import process from "process";
import {AccountsAndBalancesClient} from "../client";

import {
    consoleLogger,
    currencyList,
    getClient,
} from "./common";
import {
    AnbHighLevelRequestTypes, IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbCreateAccountRequest,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";

let client: AccountsAndBalancesClient;

const hubJokeAccountId = "00000000-0000-0000-0000-000000000001";        // 1
const hubControlAccountId = "00000000-0000-0000-0000-000000000005";     // 5

// const payerPosAccountId = "00000000-0000-0000-0000-000000001001";       // 4097
// const payerLiquidityAccountId = "00000000-0000-0000-0000-000000001002"; // 4098
// const payerControlAccountId = "00000000-0000-0000-0000-000000001005";   // 4101
//
// const payeePosAccountId = "00000000-0000-0000-0000-000000002001";       // 8193
// const payeeLiquidityAccountId = "00000000-0000-0000-0000-000000002002"; // 8194
// const payeeControlAccountId = "00000000-0000-0000-0000-000000002005";   // 8197


// reverse payer and apyee
const payeePosAccountId = "00000000-0000-0000-0000-000000001001";       // 4097
const payeeLiquidityAccountId = "00000000-0000-0000-0000-000000001002"; // 4098
const payeeControlAccountId = "00000000-0000-0000-0000-000000001005";   // 4101

const payerPosAccountId = "00000000-0000-0000-0000-000000002001";       // 8193
const payerLiquidityAccountId = "00000000-0000-0000-0000-000000002002"; // 8194
const payerControlAccountId = "00000000-0000-0000-0000-000000002005";   // 8197


const testDurationSecs = 120;
const batchSize = 2600;

const start = async ()=> {
    client = await getClient();

    const testStartTs = Date.now();
    await client.Init();
    console.log(`Init took: ${Date.now() - testStartTs}`);

    const isReady = await client.isReady();
    if (!isReady){
        throw new Error("Client not ready - cannot continue");
    }

    // test single transfer
    const resp = await request_processHighLevelBatch(1);
    console.log(resp);

    // const startLoadTs = Date.now();
    //
    // let transferCount = 0;
    // let totalMs = 0;
    // let iteration = 0;
    // let maxBatchMs = -1, minBatchMs = -1;
    // const batchDurations: number[] = [];
    // while(Date.now() - testStartTs <= testDurationSecs*1000) {
    //     const batchStartTs = Date.now();
    //     const resp = await request_processHighLevelBatch(batchSize);
    //     const tookMs = Date.now() - batchStartTs;
    //
    //     iteration++;
    //     totalMs += tookMs;
    //     batchDurations.push(tookMs);
    //     transferCount += resp.length;
    //     if(minBatchMs == -1 || tookMs < minBatchMs) minBatchMs = tookMs;
    //     if(maxBatchMs == -1 || tookMs > maxBatchMs) maxBatchMs = tookMs;
    //
    //     if(iteration % 20 == 0) {
    //         console.log(`loadtest completed batch of ${resp.length} sets took: ${tookMs}  - ${tookMs / resp.length} ms per req - iteration: ${iteration}\n`);
    //     }
    // }
    //
    // const loadTookMs = Date.now()-startLoadTs;
    // const stdDev = standardDeviation(batchDurations);
    //
    // consoleLogger.debug(`TEST COMPLETE - ${iteration} batches sent, ${batchSize * 2} batchSize`);
    // consoleLogger.debug(`  Total runtime ${Math.ceil(loadTookMs/1000)} secs`);
    // consoleLogger.debug(`  Batch durations - avg: ${Math.ceil(loadTookMs / iteration)} ms - min: ${minBatchMs} ms - max: ${maxBatchMs} ms - stdDev: ${Math.round(stdDev*100)/100}`);
    // consoleLogger.debug(`  Average per req: ${Math.round((loadTookMs / transferCount) * 1000) / 1000} ms`);

};

async function request_processHighLevelBatch(count:number):Promise<IAnbHighLevelResponse[]> {
    const allRequests: IAnbHighLevelRequest[] = [];

    for(let i=0; i<count; i++){
        const req1Id = i, req2Id = i+1, transferId = randomUUID();

        // payer to payee
        const request1:IAnbCheckLiquidAndReserveRequest = {
            requestType: AnbHighLevelRequestTypes.checkLiquidAndReserve,
            requestId: `${req1Id+900000}`,
            currencyCode: "EUR",
            transferId: transferId,
            transferAmount: "1",
            payerPositionAccountId: payerPosAccountId.toString(),
            payerLiquidityAccountId: payerLiquidityAccountId.toString(),
            hubJokeAccountId: hubJokeAccountId.toString(),
            payerNetDebitCap: "0",
            payerControlAccountId: payerControlAccountId.toString(),
            hubTmpControlAccountId: hubControlAccountId.toString()
        };

        const request2:IAnbCancelReservationAndCommitRequest = {
            requestType: AnbHighLevelRequestTypes.cancelReservationAndCommit,
            requestId: `${req2Id+900000}`,
            currencyCode: "EUR",
            transferId: transferId,
            transferAmount: "1",
            payerPositionAccountId: payerPosAccountId.toString(),
            payeePositionAccountId: payeePosAccountId.toString(),
            hubJokeAccountId: hubJokeAccountId.toString(),
            payerControlAccountId: payerControlAccountId.toString(),
            hubTmpControlAccountId: hubControlAccountId.toString(),
            payeeControlAccountId: payeeControlAccountId.toString()
        };
        allRequests.push(...[request1,request2]);
    }

    const resps: IAnbHighLevelResponse[] = await client.processHighLevelBatch(allRequests);
    return resps;
}

// https://stackoverflow.com/questions/7343890/standard-deviation-javascript/63838108#63838108
const standardDeviation = (arr: number[], usePopulation = false) => {
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;

    // @ts-ignore
    return Math.sqrt(arr.reduce((acc, val:number) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /(arr.length - (usePopulation ? 0 : 1)));
};

/*async function checkLiquidAndReserve(reqId: string, transferId:string):Promise<IAnbHighLevelResponse[]> {
    const req: IAnbCheckLiquidAndReserveRequest = {
        requestType: AnbHighLevelRequestTypes.checkLiquidAndReserve,
        requestId: reqId,
        currencyCode: "EUR",
        transferId: transferId,
        transferAmount: "1",
        payerPositionAccountId: payerPosAccountId,
        payerLiquidityAccountId: payerLiquidityAccountId,
        hubJokeAccountId: hubJokeAccountId,
        payerNetDebitCap: "0",
    };
    const resps: IAnbHighLevelResponse[] = await client.processHighLevelBatch([req]);
    return resps;
}
async function cancelReservationAndCommit(reqId: string, transferId:string):Promise<IAnbHighLevelResponse[]> {
    const req: IAnbCancelReservationAndCommitRequest = {
        requestType: AnbHighLevelRequestTypes.cancelReservationAndCommit,
        requestId: reqId,
        currencyCode: "EUR",
        transferId: transferId,
        transferAmount: "1",
        payerPositionAccountId: payerPosAccountId,
        payeePositionAccountId: payeePositionAccountId,
        hubJokeAccountId: hubJokeAccountId,
    };
    const resps: IAnbHighLevelResponse[] = await client.processHighLevelBatch([req]);
    return resps;
}*/


start().then(()=>{
    console.log("done");
    process.exit(0);
});

