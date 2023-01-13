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

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {GrpcServer} from "./grpc_server/grpc_server";
import {IChartOfAccountsRepo} from "../domain/infrastructure-types/chart_of_accounts_repo";
import {ChartOfAccountsMongoRepo} from "../implementations/chart_of_accounts_mongo_repo";
import {AccountsAndBalancesAggregate} from "../domain/aggregate";
import {BuiltinLedgerAdapter} from "../implementations/builtin_ledger_adapter";
import {ILedgerAdapter} from "../domain/infrastructure-types/ledger_adapter";

/* ********** Constants Begin ********** */

const BC_NAME: string = "accounts-and-balances-bc";
const SVC_NAME: string = "grpc-svc";
const SVC_VERSION: string = process.env.npm_package_version || "0.0.1"; // TODO: is this correct?

const KAFKA_URL: string = process.env.KAFKA_URL || "localhost:9092";

const LOG_LEVEL: LogLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.DEBUG;
const KAFKA_LOGS_TOPIC: string = process.env.KAFKA_LOGS_TOPIC || "logs";

const MONGO_URL: string = process.env.MONGO_URL || "mongodb://root:mongoDbPas42@localhost:27017";

const LEDGER_URL: string = process.env.LEDGER_URL || "localhost:5678";

const ACCOUNTS_AND_BALANCES_URL: string = process.env.GRPC_SVC_URL || "localhost:1234";

/* ********** Constants End ********** */

export class GrpcService {
    private static logger: ILogger;
    private static auditingClient: IAuditClient;
    private static chartOfAccountsRepo: IChartOfAccountsRepo;
    private static ledgerAdapter: ILedgerAdapter;
    private static grpcServer: GrpcServer;

    private static loggerIsChild: boolean; // TODO: avoid this.

    static async start(
        logger?: ILogger,
        chartOfAccountsRepo?: IChartOfAccountsRepo,
        ledgerAdapter?: ILedgerAdapter
    ): Promise<void> {
        // Logger.
        if (logger !== undefined) {
            this.logger = logger.createChild(this.name);
            this.loggerIsChild = true;
        } else {
            this.logger = new KafkaLogger(
                BC_NAME,
                SVC_NAME,
                SVC_VERSION,
                {kafkaBrokerList: KAFKA_URL},
                KAFKA_LOGS_TOPIC,
                LOG_LEVEL
            );
            this.loggerIsChild = false;
            try {
                await (this.logger as KafkaLogger).init();
            } catch (error: unknown) {
                console.error(error); // TODO: use console?
                await this.stop();
                process.exit(-1); // TODO: verify code.
            }
        }

        // Repo.
        if (chartOfAccountsRepo !== undefined) {
            this.chartOfAccountsRepo = chartOfAccountsRepo;
        } else {
            this.chartOfAccountsRepo = new ChartOfAccountsMongoRepo(
                this.logger,
                MONGO_URL
            );
            try {
                await this.chartOfAccountsRepo.init();
            } catch (error: unknown) {
                this.logger.fatal(error);
                await this.stop();
                process.exit(-1); // TODO: verify code.
            }
        }

        // Ledger adapter.
        if (ledgerAdapter !== undefined) {
            this.ledgerAdapter = ledgerAdapter;
        } else {
            this.ledgerAdapter = new BuiltinLedgerAdapter(
                this.logger,
                LEDGER_URL
            );
            try {
                await this.ledgerAdapter.init();
            } catch (error: unknown) {
                this.logger.fatal(error);
                await this.stop();
                process.exit(-1); // TODO: verify code.
            }
        }

        // Aggregate.
        const accountsAndBalancesAggregate: AccountsAndBalancesAggregate = new AccountsAndBalancesAggregate(
            this.logger,
            this.chartOfAccountsRepo,
            this.ledgerAdapter
        );

        // gRPC server.
        this.grpcServer = new GrpcServer(
            this.logger,
            accountsAndBalancesAggregate,
            ACCOUNTS_AND_BALANCES_URL
        );
        try {
            await this.grpcServer.start();
        } catch (error: unknown) {
            this.logger.fatal(error);
            await this.stop();
            process.exit(-1); // TODO: verify code.
        }
    }

    static async stop(): Promise<void> {
        if (this.grpcServer !== undefined) {
            await this.grpcServer.stop();
        }
        if (this.ledgerAdapter !== undefined) {
            await this.ledgerAdapter.destroy();
        }
        if (this.chartOfAccountsRepo !== undefined) {
            await this.chartOfAccountsRepo.destroy();
        }
        if (this.auditingClient !== undefined) {
            await this.auditingClient.destroy();
        }
        if (this.logger instanceof KafkaLogger && !this.loggerIsChild) {
            await this.logger.destroy();
        }
    }
}

async function handleSignals(signal: NodeJS.Signals): Promise<void> {
    console.info(`${signal} received`); // TODO: use console?
    await GrpcService.stop();
    process.exit();
}

process.on("SIGINT", handleSignals); // SIGINT = 2 (Ctrl + c).
process.on("SIGTERM", handleSignals); // SIGTERM = 15.
process.on("exit", () => {
    console.info(`exiting ${SVC_NAME}`);
});
