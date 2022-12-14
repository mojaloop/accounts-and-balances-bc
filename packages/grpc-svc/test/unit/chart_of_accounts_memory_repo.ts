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

import {IChartOfAccountsRepo} from "../../src/domain/infrastructure-types/chart_of_accounts_repo";
import {CoaAccount} from "../../src/domain/coa_account";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountAlreadyExistsError, UnableToGetAccountsError, UnableToStoreAccountsError} from "../../src/domain/errors";

export class ChartOfAccountsMemoryRepo implements IChartOfAccountsRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly accounts: Map<string, CoaAccount>;

	constructor(logger: ILogger) {
		//this.logger = logger;

		this.accounts = new Map();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

	async accountsExistByInternalIds(internalIds: string[]): Promise<boolean> {
		for (const coaAccount of this.accounts.values()) {
			for (const id of internalIds) {
				if (coaAccount.internalId === id) {
					return true;
				}
			}
		}
		return false;
	}

	async storeAccounts(coaAccounts: CoaAccount[]): Promise<void> {
		let accountsExists: boolean = false;
		try {
			for (const coaAccount of coaAccounts) {
				 if (this.accounts.has(coaAccount.internalId)) {
					 accountsExists = true;
					 break;
				 }
			}
		} catch (error: unknown) {
			throw new UnableToStoreAccountsError((error as any)?.message);
		}
		if (accountsExists) {
			throw new AccountAlreadyExistsError();
		}
		try {
			for (const coaAccount of coaAccounts) {
				this.accounts.set(coaAccount.internalId, coaAccount);
			}
		} catch (error: unknown) {
			throw new UnableToStoreAccountsError((error as any)?.message);
		}
	}

	async getAccountsByInternalIds(internalIds: string[]): Promise<CoaAccount[]> {
		try {
			const coaAccounts: CoaAccount[] = [];
			for (const coaAccount of this.accounts.values()) {
				for (const id of internalIds) {
					if (coaAccount.internalId === id) {
						coaAccounts.push(coaAccount);
					}
				}
			}
			return coaAccounts;
		} catch (error: unknown) {
			throw new UnableToGetAccountsError((error as any)?.message);
		}
	}

	async getAccountsByOwnerId(ownerId: string): Promise<CoaAccount[]> {
		try {
			const coaAccounts: CoaAccount[] = [];
			for (const coaAccount of this.accounts.values()) {
				if (coaAccount.ownerId === ownerId) {
					coaAccounts.push(coaAccount);
				}
			}
			return coaAccounts;
		} catch (error: unknown) {
			throw new UnableToGetAccountsError((error as any)?.message);
		}
	}
}
