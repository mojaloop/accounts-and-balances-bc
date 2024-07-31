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
    // hubJokeAccountId, payeePositionAccountId, payerLiquidityAccountId, payerPosAccountId
} from "./common";
import {IAnbCreateAccountRequest} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

const hubJokeAccountId = "00000000-0000-0000-0000-000000000001";        // 1
const hubControlAccountId = "00000000-0000-0000-0000-000000000005";     // 5

const payerPosAccountId = "00000000-0000-0000-0000-000000001001";       // 4097
const payerLiquidityAccountId = "00000000-0000-0000-0000-000000001002"; // 4098
const payerControlAccountId = "00000000-0000-0000-0000-000000001005";   // 4101

const payeePosAccountId = "00000000-0000-0000-0000-000000002001";       // 8193
const payeeLiquidityAccountId = "00000000-0000-0000-0000-000000002002"; // 8194
const payeeControlAccountId = "00000000-0000-0000-0000-000000002005";   // 8197

let client: AccountsAndBalancesClient;

const start = async ()=> {
    client = await getClient();

    const startTs = Date.now();
    await client.Init();
    console.log(`Init took: ${Date.now() - startTs}`);

    const isReady = await client.isReady();
    if (!isReady){
        throw new Error("Client not ready - cannot continue");
    }
    const curCode = currencyList[0].code;

    const createRequests: IAnbCreateAccountRequest[] = [
        {
            requestedId: hubJokeAccountId,
            type: "HUB_RECONCILIATION",
            ownerId: "hub",
            currencyCode: curCode
       }, {
            requestedId: hubControlAccountId,
            type: "HUB_TMP_CONTROL",
            ownerId: "hub",
            currencyCode: curCode
        },{
            requestedId: payerPosAccountId,
            type: "POSITION",
            ownerId: "payer1",
            currencyCode: curCode
        },{
            requestedId: payerLiquidityAccountId,
            type: "LIQUIDITY",
            ownerId: "payer1",
            currencyCode: curCode
        },  {
            requestedId: payerControlAccountId,
            type: "TIGERBEETLE_CONTROL",
            ownerId: "payer1",
            currencyCode: curCode
        },{
            requestedId: payeePosAccountId,
            type: "POSITION",
            ownerId: "payee1",
            currencyCode: curCode
        },{
            requestedId: payeeLiquidityAccountId,
            type: "LIQUIDITY",
            ownerId: "payee1",
            currencyCode: curCode
        },  {
            requestedId: payeeControlAccountId,
            type: "TIGERBEETLE_CONTROL",
            ownerId: "payee1",
            currencyCode: curCode
        }
    ];



    const resp = await client.createAccounts(createRequests);
    consoleLogger.debug(resp);

    /*
    * initial transfers:
    * create_transfers code=1 ledger=978 id=1 debit_account_id=1 credit_account_id=4098 amount=999900;
    * create_transfers code=1 ledger=978 id=2 debit_account_id=5 credit_account_id=4101 amount=999900;
    * */
};


start().then(()=>{
    console.log("done");
    process.exit(0);
});

