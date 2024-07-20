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
    coaNumFromAccountType,
    consoleLogger,
    currencyList,
    getClient,
    hubJokeAccountId,
    ledgerNumFromCurrencyCode,
    payeePositionAccountId,
    payerLiquidityAccountId,
    payerPosAccountId,
    uuidToBigint
} from "./common";
import {IAnbCreateAccountRequest} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import * as TB from "tigerbeetle-node";
import {ICoaAccount} from "../types";


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

    const tbClient = TB.createClient({
        cluster_id: 0n,
        replica_addresses: ["13000"],
    });

    const createAccountRequests: TB.Account[] = [];
    for(const coaAcc of client.coaAccounts){
        try{
            const tbCreateAccount = getTbCreateAccountReq(coaAcc);
            if(tbCreateAccount) createAccountRequests.push(tbCreateAccount);
        }catch(err){
            // don't care, probably test account ids
            console.log(`Account with ID: ${coaAcc.id} couldn't not be created in TB`);
        }
    }

    const createAccountsResp = await tbClient.createAccounts(createAccountRequests);
    console.log(createAccountsResp);
};

function getTbCreateAccountReq(coaAccount: ICoaAccount): TB.Account{
    const coa = coaNumFromAccountType(coaAccount.type);
    const ledger = ledgerNumFromCurrencyCode(coaAccount.currencyCode);
    return {
        id: uuidToBigint(coaAccount.id), // u128
        debits_pending: 0n,  // u64
        debits_posted: 0n,  // u64
        credits_pending: 0n, // u64
        credits_posted: 0n, // u64
        user_data_128: 0n, // u128, opaque third-party identifier to link this account to an external entity.
        user_data_64: 0n,// u64
        user_data_32: 0,// u32
        reserved: 0, // [48]u8
        ledger: ledger,   // u32, ledger value
        code: coa, // u16, a chart of accounts code describing the type of account (e.g. clearing, settlement)
        flags: 0,  // u16
        timestamp: 0n, // u64, Reserved: This will be set by the server.
    };
}




start().then(()=>{
    console.log("done");
    process.exit(0);
});


