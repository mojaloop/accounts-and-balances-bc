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
 should be listed with a "*" in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a "-". Email address can be added
 optionally within square brackets <email>.

 * Interledger Foundation
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/
"use strict";

import console from "console";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesClient} from "../client";
import {join} from "path";
import {
    AnbAccountType,
    AnbHighLevelRequestTypes,
    IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest,
    IAnbGrpcCertificatesFiles,
    IAnbHighLevelRequest,
    IAnbHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import process from "process";
import { randomUUID } from "crypto";
import {Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";


// tests below - MOVE TO UNIT TESTS

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token";

// const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "participants-bc-participants-svc"; // can create accounts
const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "transfers-bc-command-handler-svc"; // can create entries
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";
const ACCOUNTS_BALANCES_COA_SVC_URL =  process.env["ACCOUNTS_BALANCES_COA_SVC_URL"] || "localhost:3300";

// const certDir = join(__dirname, "../../../../test_certs");
// const certFiles:IAnbGrpcCertificatesFiles = {
//     caCertFilePath: join(certDir, "ca.crt"),
//     privateKeyFilePath: join(certDir, "client.key"),
//     certChainFilePath: join(certDir, "client.crt")
// };

let client: AccountsAndBalancesClient;

const ACCOUNT_TYPE_MAP: {[key: string]: number} = {
    "HUB_RECONCILIATION": 1,
    "POSITION": 1_000,
    "LIQUIDITY": 1_001,
    "SETTLEMENT": 100_000,
};

export const currencyList:Currency[] =[ { code: "EUR", num: "978", decimals: 2 }, { code: "USD", num: "840", decimals: 2 }, { code: "MMK", num: "104", decimals: 2 }];
export const consoleLogger = new ConsoleLogger();
//
// export const hubJokeAccountId = "test1_hubJokeAccountId";
// export const payerPosAccountId = "test1_payerPosAccountId";
// export const payerLiquidityAccountId = "test1_payerLiquidityAccountId";
// export const payeePositionAccountId = "test1_payeePositionAccountId";

// export const hubJokeAccountId = "8e7b4e00-b9c4-42b1-a2ad-579cc903eca9";
// export const payerPosAccountId = "e9bf41e2-fe87-4a9a-a4c1-ae0a2b16d209";
// export const payerLiquidityAccountId = "644029f1-9b38-4c93-a6ab-1e6f1a8a1fe9";
// export const payeePositionAccountId = "ea27e118-fa0b-47e1-b045-152f05492a39";

// for builtin ledger
export const hubJokeAccountId = "8e7b4e00-b9c4-42b1-a2ad-579cc903eca2";
export const payerPosAccountId = "e3ec30de-7bef-4b3f-bc10-771528eea378";

export const payerLiquidityAccountId = "e3ec30de-7bef-4b3f-bc10-771528eea378";
export const payeePositionAccountId = "298e426f-ce95-4005-937b-87f9208f8d63";

export async function getClient():Promise<AccountsAndBalancesClient>{
    const loginHelper = new LoginHelper(AUTH_N_SVC_TOKEN_URL, consoleLogger);
    loginHelper.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
    await loginHelper.getToken(); // get an initial token (fail fast)

    // client = new AccountsAndBalancesClient(controlPlaneUrl, consoleLogger, loginHelper, currencies, new MetricsMock(), certFiles);
    const client = new AccountsAndBalancesClient(ACCOUNTS_BALANCES_COA_SVC_URL, consoleLogger, loginHelper, new MetricsMock());
    return client;
}



export function ledgerNumFromCurrencyCode(currencyCode: string): number {
    const found = currencyList.find(value => value.code === currencyCode);
    if(found == undefined){
        throw new Error(`Currency with code: '${currencyCode}' not found`);
    }

    const num:number = parseInt(found.num);
    if(num == undefined) {
        throw new Error(`Invalid currencyNum in currency: '${found.code}' - ${found.num} is not a number`);
    }
    return num;
}

export function currencyCodeFromLedgerNum(ledger: number): string {
    const found = currencyList.find(value => parseInt(value.num) === ledger);
    if(found == undefined){
        throw new Error(`Currency with num: '${ledger}' not found`);
    }
    return found.code;
}

export function coaNumFromAccountType(type: AnbAccountType): number {
    const num:number | undefined = ACCOUNT_TYPE_MAP[type];
    if(num == undefined) {
        throw new Error(`Account type for type: "${type}" not found.`);
    }
    return num;
}

export function accountTypeFromCoaCode(coaNum: number): AnbAccountType {
    const found =  Object.entries(ACCOUNT_TYPE_MAP).find((value) => value[1] === coaNum);
    if(found == undefined) {
        throw new Error(`Account type for coaNum: "${coaNum}" not found.`);
    }

    return found[0] as AnbAccountType;
}

// inspired from https://stackoverflow.com/a/53751162/5743904
export function uuidToBigint(uuid: string) : bigint {
    // let hex = uuid.replaceAll("-",""); // replaceAll only works on es2021
    let hex = uuid.replace(/-/g, "");
    if (hex.length % 2) {
        hex = "0" + hex;
    }
    const bi = BigInt("0x" + hex);
    return bi;
}

export function bigIntToUuid(bi: bigint): string {
    let str = bi.toString(16);
    while (str.length < 32) str = "0"+str;

    if (str.length !== 32) {
        console.warn(`_bigIntToUuid() got string that is not 32 chars long: "${str}"`);
    } else {
        str = str.substring(0, 8)+"-"+str.substring(8, 12)+"-"+str.substring(12, 16)+"-"+str.substring(16, 20)+"-"+str.substring(20);
    }
    return str;
}



/* EXAMPLE CODE stash



import * as console from "console";
import {join} from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import type { ProtoGrpcType } from "./_proto_types/control_plane";
import {InterceptingCall, InterceptorProvider, NextCall, Requester, RequesterBuilder} from "@grpc/grpc-js";


const protoFilePath = join(__dirname, "control_plane.proto");
const packageDefinition = protoLoader.loadSync(protoFilePath);
const proto:ProtoGrpcType = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;



//This example logs all outbound messages:
// const interceptor = function(options: any, nextCall: NextCall) {
//     return new InterceptingCall(nextCall(options), {
//         sendMessage: function(message, next) {
//             console.log(message);
//             next(message);
//         }
//     });
// };

const interceptor = function(options:any, nextCall: NextCall) {
    const requester:Requester = {
        start: function(metadata:any, listener:any, next:any) {
            const newListener = {
                onReceiveMetadata: function(metadata:any, next:any) {
                    console.log(`onReceiveMetadata ${JSON.stringify(metadata, null,2)}`);
                    next(metadata);
                },
                onReceiveMessage: function(message:any, next:any) {
                    console.log(`onReceiveMessage ${JSON.stringify(message, null,2)}`);
                    next(message);
                },
                onReceiveStatus: function(status:any, next:any) {
                    console.log(`onReceiveStatus ${JSON.stringify(status, null,2)}`);

                    if (status.code == grpc.status.UNAUTHENTICATED) {
                        console.log("got UNAUTHENTICATED");
                        next({code: grpc.status.OK});
                        return;
                    }

                    next(status);
                }
            };
            next(metadata, newListener);
        },
        sendMessage: function(message:any, next:any) {
            next(message);
        },
        halfClose: function(next:any) {
            console.log("halfClose");
            next();
        },
        cancel: function (next) {
            console.log("cancel");
            next();
        }
    };
    return new InterceptingCall(nextCall(options), requester);
};

const client = new proto.ControlPlaneService(
    "localhost:3300",
    grpc.credentials.createInsecure()
);


const deadline: grpc.Deadline = Date.now() + 5_000;
client.waitForReady(deadline, (error?:Error) => {
    if (error)
        throw error;

    const stream = client.ClientStream({ interceptors: [interceptor] });
    stream.on("end", () => {
        console.log("stream on end");
    });
    stream.on("error", (error) => {
        console.error(error);
    });
    stream.on("data", (data)=>{
        console.log(data);
    });

    stream.on("close", ()=>{
        console.log("stream on close");
    });
    stream.on("finish", ()=>{
        console.log("stream on finish");
    });
    stream.on("status", (status)=>{
        console.log(`stream on status: ${JSON.stringify(status, null,2)}`);
    });
    stream.write({
        initialRequest:{
            clientName: "test1",
            token: "token"
        }
    });


});


*/

