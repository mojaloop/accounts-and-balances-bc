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
    getClient, hubJokeAccountId, payeePositionAccountId, payerLiquidityAccountId, payerPosAccountId
} from "./common";
import {IAnbCreateAccountRequest} from "@mojaloop/accounts-and-balances-bc-public-types-lib";


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

    const createRequests: IAnbCreateAccountRequest[] = [
        {
            requestedId: hubJokeAccountId,
            type: "HUB_RECONCILIATION",
            ownerId: "hub",
            currencyCode: currencyList[0].code
       },
    {
            requestedId: payerPosAccountId,
            type: "POSITION",
            ownerId: "payer1",
            currencyCode: currencyList[0].code
        },
        {
            requestedId: payerLiquidityAccountId,
            type: "LIQUIDITY",
            ownerId: "payer1",
            currencyCode: currencyList[0].code
        },
        {
            requestedId: payeePositionAccountId,
            type: "POSITION",
            ownerId: "payee1",
            currencyCode: currencyList[0].code
        }
    ];

    const resp = await client.createAccounts(createRequests);
    consoleLogger.debug(resp);
};


start().then(()=>{
    console.log("done");
    process.exit(0);
});

