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

import {
	IAccountsRepo,
	UnableToInitRepoError,
	NoSuchAccountError,
	AccountAlreadyExistsError,
	UnableToStoreAccountError,
	UnableToGetAccountError,
	UnableToUpdateAccountError,
	UnableToGetAccountsError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class MemoryAccountsRepo implements IAccountsRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private unexpectedFailure: boolean; // TODO: should this be done?
	private readonly accounts: Map<string, IAccountDto>;

	constructor(logger: ILogger) {
		this.logger = logger;

		this.unexpectedFailure = false;
		this.accounts = new Map<string, IAccountDto>();
	}

	async init(): Promise<void> {
		if (this.unexpectedFailure) {
			throw new UnableToInitRepoError();
		}
	}

	async destroy(): Promise<void> {
		return;
	}

	async accountExistsById(accountId: string): Promise<boolean> {
		if (this.unexpectedFailure) {
			throw new UnableToGetAccountError();
		}
		return this.accounts.has(accountId);
	}

	async storeNewAccount(account: IAccountDto): Promise<void> {
		if (this.unexpectedFailure) {
			throw new UnableToStoreAccountError();
		}
		if (await this.accountExistsById(account.id)) {
			throw new AccountAlreadyExistsError();
		}
		this.accounts.set(account.id, account);
	}

	async getAccountById(accountId: string): Promise<IAccountDto | null> {
		if (this.unexpectedFailure) {
			throw new UnableToGetAccountError();
		}
		return this.accounts.get(accountId) ?? null;
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
		if (this.unexpectedFailure) {
			throw new UnableToGetAccountsError();
		}
		const accounts: IAccountDto[] = [];
		for (const account of this.accounts.values()) {
			if (account.externalId === externalId) {
				accounts.push(account);
			}
		}
		return accounts;
	}

	async updateAccountCreditBalanceById(
		accountId: string,
		creditBalance: string,
		timeStampLastJournalEntry: number
	): Promise<void> {
		if (this.unexpectedFailure) {
			throw new UnableToUpdateAccountError();
		}
		const account: IAccountDto | undefined = this.accounts.get(accountId);
		if (account === undefined) {
			throw new NoSuchAccountError();
		}
		account.creditBalance = creditBalance;
		account.timestampLastJournalEntry = timeStampLastJournalEntry;
	}

	async updateAccountDebitBalanceById(
		accountId: string,
		debitBalance: string,
		timeStampLastJournalEntry: number
	): Promise<void> {
		if (this.unexpectedFailure) {
			throw new UnableToUpdateAccountError();
		}
		const account: IAccountDto | undefined = this.accounts.get(accountId);
		if (account === undefined) {
			throw new NoSuchAccountError();
		}
		account.debitBalance = debitBalance;
		account.timestampLastJournalEntry = timeStampLastJournalEntry;
	}

	setUnexpectedFailure(unexpectedFailure: boolean) {
		this.unexpectedFailure = unexpectedFailure;
	}
}
