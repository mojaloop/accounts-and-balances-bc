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
import {IRepo} from "./infrastructure-interfaces/irepo";
import {IAccount} from "@mojaloop/accounts-and-balances-public-types";

export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly repo: IRepo;
	// Other properties.

	constructor(
		logger: ILogger,
		repo: IRepo
	) {
		this.logger = logger;
		this.repo = repo;
	}

	async init(): Promise<void> {
		try {
			await this.repo.init();
		} catch (e: unknown) {
			this.logger.fatal(e); // TODO: fatal?
			throw e; // No need to be specific - internal server error.
		}
	}

	async destroy(): Promise<void> {
		await this.repo.destroy();
	}

	async createAccount(account: IAccount): Promise<void> {
		try {
		} catch (e: unknown) {
		}
	}

	async createAccountEntries(x: any /* TODO. */): Promise<void> {
		try {
		} catch (e: unknown) {
		}
	}

	async getAccountDetails(accountId: string): Promise<any> {
		try {
		} catch (e: unknown) {
		}
	}

	async getAccountEntries(accountId: string): Promise<any> {
		try {
		} catch (e: unknown) {
		}
	}
}
