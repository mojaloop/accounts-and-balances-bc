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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {IChartOfAccountsRepo} from "packages/grpc-svc/src/domain/chart_of_accounts_repo_interface";
import {ILedgerAdapter} from "packages/grpc-svc/src/domain/ledger_adapter_interfaces";
import {BuiltinLedgerAdapter} from "packages/grpc-svc/src/implementations/builtin_ledger_adapter";
import {ChartOfAccountsMongoRepo} from "packages/grpc-svc/src/implementations/chart_of_accounts_mongo_repo";
import {AccountsAndBalancesAggregate} from "packages/grpc-svc/src/domain/aggregate";


const BC_NAME = "accounts-and-balances-bc";
const APP_NAME = "grpc-svc";
const APP_VERSION = "0.0.1";
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";

let globalLogger: ILogger;
const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

export class Service {
    static logger: ILogger;
    static aggregate: AccountsAndBalancesAggregate;
    static coaRepo: IChartOfAccountsRepo;
    static ledgerAdapter: ILedgerAdapter;

    static async start(
            logger?: ILogger,
            coaRepo?: IChartOfAccountsRepo,
            ledgerAdapter?:ILedgerAdapter
    ): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        if (!logger) {
            logger = new KafkaLogger(
                    BC_NAME,
                    APP_NAME,
                    APP_VERSION,
                    kafkaProducerOptions,
                    KAFKA_LOGS_TOPIC,
                    LOG_LEVEL
            );
            await (logger as KafkaLogger).init();
        }
        globalLogger = this.logger = logger;

        if(!coaRepo){
            coaRepo = new ChartOfAccountsMongoRepo();
        }
        this.coaRepo = coaRepo;


        if(!ledgerAdapter){
            // TODO decide which to instantiate from params
            ledgerAdapter = new BuiltinLedgerAdapter();
        }
        this.ledgerAdapter = ledgerAdapter;

        // start agg
        this.aggregate = new AccountsAndBalancesAggregate(
                this.coaRepo,
                this.ledgerAdapter,
                this.logger);

    }


    static async stop() {

    }

}



/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    let clean_exit = false;
    setTimeout(args => { clean_exit || process.exit(99);}, 5000);

    // call graceful stop routine
    await Service.stop();

    clean_exit = true;
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals);
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
process.on("exit", async () => {
    globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
    globalLogger.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
});
