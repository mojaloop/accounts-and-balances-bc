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


import {AccountsAndBalancesClient} from "../client";
import {
    getClient,
    hubJokeAccountId,
    payeePositionAccountId,
    payerLiquidityAccountId,
    payerPosAccountId
} from "./common";
import {
    AnbHighLevelRequestTypes, IAnbCancelReservationAndCommitRequest,
    IAnbCheckLiquidAndReserveRequest, IAnbHighLevelRequest,
    IAnbHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {randomUUID} from "crypto";

let client: AccountsAndBalancesClient;


// tests below - MOVE TO UNIT TESTS

const start = async ()=>{
    const startTs = Date.now();

    client = await getClient();

    const beforeInit = Date.now();
    await client.Init();
    console.log(`Init took: ${Date.now() - beforeInit}`);

    const isReady = await client.isReady();
    if (!isReady){
        throw new Error("Client not ready - cannot continue");
    }

    let beforeRead= Date.now();
    let resp = await client.getAccountsByIds(["ea27e118-fa0b-47e1-b045-152f05492a3a"]);
    console.log(`getJournalEntriesByOwnerId took: ${Date.now() - beforeRead}`);
    console.log(JSON.stringify(resp, null, 2));

    console.log();

    beforeRead= Date.now();
    resp = await client.getAccountsByIds(["ea27e118-fa0b-47e1-b045-152f05492a3a"]);
    console.log(`getJournalEntriesByOwnerId took: ${Date.now() - beforeRead}`);
    console.log(JSON.stringify(resp, null, 2));

    console.log(`Whole thing took: ${Date.now() - startTs}`);
};



start().then(()=>{
    console.log("done");
    process.exit(0);
});


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

