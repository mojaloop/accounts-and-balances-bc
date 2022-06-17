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
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IAccount, TopicsEventStream} from "@mojaloop/accounts-and-balances-public-types";

export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly eventProducer: IMessageProducer;
	// Other properties.

	constructor(
		logger: ILogger,
		eventProducer: IMessageProducer
	) {
		this.logger = logger;
		this.eventProducer = eventProducer;
	}

	async init(): Promise<void> {
		try {
			await this.eventProducer.connect(); // Throws if the event producer is unreachable.
		} catch (e: unknown) {
			this.logger.fatal(e); // TODO: fatal?
			throw e; // No need to be specific.
		}
	}

	async destroy(): Promise<void> {
		await this.eventProducer.destroy(); // TODO: check if throws.
	}

	async createAccount(account: IAccount): Promise<void> {
		try {
			await this.eventProducer.send({ // TODO: check if throws.
				topic: TopicsEventStream.CREATE_ACCOUNT, // TODO.
				value: account
			});
		} catch (e: unknown) {
			this.logger.error(e);
			throw e; // No need to be specific - internal server error.
		}
	}

	async createAccountEntries(x: any /* TODO. */): Promise<void> {
		await this.eventProducer.send({ // TODO: check if throws.
			topic: TopicsEventStream.CREATE_ACCOUNT_ENTRIES, // TODO.
			value: x
		});
	}

	async getAccountDetails(accountId: string): Promise<any> {
		await this.eventProducer.send({ // TODO: check if throws.
			topic: TopicsEventStream.GET_ACCOUNT_DETAILS, // TODO.
			value: accountId
		});
	}

	async getAccountEntries(accountId: string): Promise<any> {
		await this.eventProducer.send({ // TODO: check if throws.
			topic: TopicsEventStream.GET_ACCOUNT_ENTRIES, // TODO.
			value: accountId
		});
	}

	/*async insertJournalEntry(): Promise<void> {
	}

	async queryAccount(): Promise<void> {
	}

	async queryJournalEntries(): Promise<void> {
	}

	async closeAccount(): Promise<void> {
	}*/
}
