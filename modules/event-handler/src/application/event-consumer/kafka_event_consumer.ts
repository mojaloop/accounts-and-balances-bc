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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Aggregate} from "@mojaloop/accounts-and-balances-web-server/dist/domain/aggregate";
import {IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {MLKafkaConsumer, MLKafkaConsumerOutputType} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

export class KafkaEventConsumer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly topics: string[];
	// Other properties.
	private readonly eventConsumer: IMessageConsumer;

	constructor(
		logger: ILogger,
		EVENT_STREAM_URL: string,
		EVENT_CONSUMER_ID: string,
		aggregate: Aggregate
	) {
		this.logger = logger;

		this.callbacks = new KafkaCallbacks(
			logger,
			aggregate
		);
		this.eventConsumer = new MLKafkaConsumer(
			{
				kafkaBrokerList: EVENT_STREAM_URL,
				kafkaGroupId: EVENT_CONSUMER_ID,
				outputType: MLKafkaConsumerOutputType.Json // TODO.
			},
			logger
		);
	}

	async init(): Promise<void> {
		try {
			await this.eventConsumer.connect(); // TODO: check if throws.
			this.eventConsumer.setCallbackFn(handler); // TODO: check if throws.
			this.eventConsumer.setTopics(this.topics); // TODO: check if throws.
			/*this.app.listen(this.PORT_NO, () => {
				this.logger.info("Server on.");
				this.logger.info(`Host: ${this.HOST}`);
				this.logger.info(`Port: ${this.PORT_NO}`);
				this.logger.info(`Base URL: ${this.BASE_URL}`);
			});*/
			await this.eventConsumer.start(); // TODO: log info? check if throws.
		} catch (e: unknown) {
			this.logger.fatal(e); // TODO: fatal?
			throw e; // No need to be specific.
		}
	}

	async destroy(): Promise<void> {
		await this.eventConsumer.destroy(false); // TODO: boolean; check if throws.
	}
}
