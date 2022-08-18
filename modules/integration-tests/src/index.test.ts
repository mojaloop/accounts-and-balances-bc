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

import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesServiceMock} from "../../client/test/unit/accounts_and_balances_service_mock";
import {AccountsAndBalancesClient} from "@mojaloop/accounts-and-balances-bc-client";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {MLKafkaProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

/* ********** Constants Begin ********** */

// General.
const BOUNDED_CONTEXT_NAME: string = "Accounts and Balances";
const SERVICE_NAME: string = `${BOUNDED_CONTEXT_NAME} - Integration Tests`;
const SERVICE_VERSION: string = "0.0.1";

// Message broker.
const MESSAGE_BROKER_HOST: string = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST ?? "localhost";
const MESSAGE_BROKER_PORT_NO: number =
	parseInt(process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO ?? "") || 9092;
const MESSAGE_BROKER_URL: string = `${MESSAGE_BROKER_HOST}:${MESSAGE_BROKER_PORT_NO}`;

// Logging.
const LOGGING_LEVEL: LogLevel = LogLevel.DEBUG;
const LOGGING_TOPIC: string = `${SERVICE_NAME} - Logging`;

// Accounts and Balances client.
const ACCOUNTS_AND_BALANCES_URL: string = "http://localhost:1234";
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

/* ********** Constants End ********** */

let accountsAndBalancesClient: AccountsAndBalancesClient;

describe("accounts and balances bounded context - integration tests", () => {
	beforeAll(async () => {
		const kafkaProducerOptions: MLKafkaProducerOptions = {
			kafkaBrokerList: MESSAGE_BROKER_URL
			// TODO: producerClientId?
		}
		const logger: KafkaLogger = new KafkaLogger( // TODO: ILogger? is this the logger to use?
			BOUNDED_CONTEXT_NAME,
			SERVICE_NAME,
			SERVICE_VERSION,
			kafkaProducerOptions,
			LOGGING_TOPIC,
			LOGGING_LEVEL
		);
		await logger.start(); // TODO: here or on the aggregate?
		accountsAndBalancesClient = new AccountsAndBalancesClient(
			logger,
			ACCOUNTS_AND_BALANCES_URL,
			HTTP_CLIENT_TIMEOUT_MS
		);
	});

	afterAll(async () => {
	});

	test("create non-existent account", async () => {
	});
});
