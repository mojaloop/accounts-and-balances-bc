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

import {IBuiltinLedgerAccountsRepo} from "../../src/domain/infrastructure";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {BuiltinLedgerAccount} from "../../src/domain/entities";
import {
	AccountAlreadyExistsError,
	AccountNotFoundError, UnableToGetAccountsError,
	UnableToStoreAccountError,
	UnableToUpdateAccountError
} from "../../src/domain/errors";

export class BuiltinLedgerAccountsMemoryRepo implements IBuiltinLedgerAccountsRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly accounts: Map<string, BuiltinLedgerAccount>;

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

	async storeNewAccount(builtinLedgerAccount: BuiltinLedgerAccount): Promise<void> {
		let accountExists: boolean;
		try {
			accountExists = this.accounts.has(builtinLedgerAccount.id);
		} catch (error: unknown) {
			throw new UnableToStoreAccountError((error as any)?.message);
		}
		if (accountExists) {
			throw new AccountAlreadyExistsError();
		}
		try {
			this.accounts.set(builtinLedgerAccount.id, builtinLedgerAccount);
		} catch (error: unknown) {
			throw new UnableToStoreAccountError((error as any)?.message);
		}
	}

	async getAccountsByIds(ids: string[]): Promise<BuiltinLedgerAccount[]> {
		try {
			const builtinLedgerAccounts: BuiltinLedgerAccount[] = [];
			for (const builtinLedgerAccount of this.accounts.values()) {
				for (const id of ids) {
					if (builtinLedgerAccount.id === id) {
						builtinLedgerAccounts.push(builtinLedgerAccount);
					}
				}
			}
			return builtinLedgerAccounts;
		} catch (error: unknown) {
			throw new UnableToGetAccountsError((error as any)?.message);
		}
	}

	async updateAccountDebitBalanceAndTimestampById(
		accountId: string,
		debitBalance: bigint,
		timestampLastJournalEntry: number
	): Promise<void> {
		let builtinLedgerAccount: BuiltinLedgerAccount | undefined;
		try {
			builtinLedgerAccount = this.accounts.get(accountId);
		} catch (error: unknown) {
			throw new UnableToUpdateAccountError((error as any)?.message);
		}
		if (!builtinLedgerAccount) {
			throw new AccountNotFoundError();
		}
		builtinLedgerAccount.debitBalance = debitBalance;
		builtinLedgerAccount.timestampLastJournalEntry = timestampLastJournalEntry;
	}

	async updateAccountCreditBalanceAndTimestampById(
		accountId: string,
		creditBalance: bigint,
		timestampLastJournalEntry: number
	): Promise<void> {
		let builtinLedgerAccount: BuiltinLedgerAccount | undefined;
		try {
			builtinLedgerAccount = this.accounts.get(accountId);
		} catch (error: unknown) {
			throw new UnableToUpdateAccountError((error as any)?.message);
		}
		if (!builtinLedgerAccount) {
			throw new AccountNotFoundError();
		}
		builtinLedgerAccount.creditBalance = creditBalance;
		builtinLedgerAccount.timestampLastJournalEntry = timestampLastJournalEntry;
	}
}
