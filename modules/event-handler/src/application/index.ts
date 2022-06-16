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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Aggregate} from "../domain/aggregate";
import {IRepo} from "../domain/infrastructure-interfaces/irepo";
import {KafkaEventConsumer} from "./event-consumer/kafka_event_consumer";

/* Constants. */
const SERVICE_NAME: string = "Accounts and Balances Event Handler";
// Event stream.
const EVENT_STREAM_HOST: string =
	process.env.ACCOUNTS_AND_BALANCES_EVENT_STREAM_HOST ?? "localhost";
const EVENT_STREAM_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_EVENT_STREAM_PORT_NO ?? "") || 9092;
const EVENT_STREAM_URL: string = `${EVENT_STREAM_HOST}:${EVENT_STREAM_PORT_NO}`;
const EVENT_CONSUMER_ID: string = SERVICE_NAME;

// Logger.
const logger: ILogger = new ConsoleLogger();
// Infrastructure.
const repo: IRepo = new MongoRepo(
	logger,
	REPO_URL,
	DB_NAME,
	COLLECTION_NAME
);
// Domain.
const aggregate: Aggregate = new Aggregate(
	logger,
	repo
);
// Application.
const eventConsumer: KafkaEventConsumer = new KafkaEventConsumer(
	logger,
	EVENT_STREAM_URL,
	EVENT_CONSUMER_ID,
	aggregate
);

async function start(): Promise<void> {
	await aggregate.init(); // No need to handle exceptions. TODO.
	await eventConsumer.init(); // No need to handle exceptions. TODO.
}

process.on("SIGINT", handleIntAndTermSignals.bind(this)); // Ctrl + c.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
	logger.info(`${signal} received`);
	await aggregate.destroy();
	await eventConsumer.destroy();
	process.exit(); // TODO: necessary?
}
process.on("exit", () => {
	logger.info(`exiting ${SERVICE_NAME}`);
});

start();
