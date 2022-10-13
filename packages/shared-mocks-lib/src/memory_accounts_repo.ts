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
	readonly accounts: Map<string, IAccountDto>;

	constructor(logger: ILogger) {
		this.logger = logger;

		this.accounts = new Map<string, IAccountDto>();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

	async accountExistsById(accountId: string): Promise<boolean> {
		try {
			const accountExists: boolean = this.accounts.has(accountId);
			return accountExists;
		} catch (error: unknown) {
			throw new UnableToGetAccountError((error as any)?.message);
		}
	}

	async storeNewAccount(accountDto: IAccountDto): Promise<void> {
		if (accountDto.id === null || accountDto.currencyDecimals === null) {
			throw new UnableToStoreAccountError("account id or currency decimals null"); // TODO: error message.
		}
		let accountExists: boolean;
		try {
			accountExists = this.accounts.has(accountDto.id);
		} catch (error: unknown) {
			throw new UnableToStoreAccountError((error as any)?.message);
		}
		if (accountExists) {
			throw new AccountAlreadyExistsError();
		}
		try {
			this.accounts.set(accountDto.id, accountDto);
		} catch (error: unknown) {
			throw new UnableToStoreAccountError((error as any)?.message);
		}
	}

	async getAccountById(accountId: string): Promise<IAccountDto | null> {
		try {
			const accountDto: IAccountDto | null = this.accounts.get(accountId) ?? null;
			return accountDto;
		} catch (error: unknown) {
			throw new UnableToGetAccountError((error as any)?.message);
		}
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
		const accountDtos: IAccountDto[] = [];
		try {
			for (const accountDto of this.accounts.values()) {
				if (accountDto.externalId === externalId) {
					accountDtos.push(accountDto);
				}
			}
		} catch (error: unknown) {
			throw new UnableToGetAccountsError((error as any)?.message);
		}
		return accountDtos;
	}

	async updateAccountCreditBalanceAndTimestampById(
		accountId: string,
		creditBalance: string,
		timeStampLastJournalEntry: number
	): Promise<void> {
		let accountDto: IAccountDto | undefined;
		try {
			accountDto = this.accounts.get(accountId);
		} catch (error: unknown) {
			throw new UnableToUpdateAccountError((error as any)?.message);
		}
		if (accountDto === undefined) {
			throw new NoSuchAccountError();
		}
		accountDto.creditBalance = creditBalance;
		accountDto.timestampLastJournalEntry = timeStampLastJournalEntry;
	}

	async updateAccountDebitBalanceAndTimestampById(
		accountId: string,
		debitBalance: string,
		timeStampLastJournalEntry: number
	): Promise<void> {
		let accountDto: IAccountDto | undefined;
		try {
			accountDto = this.accounts.get(accountId);
		} catch (error: unknown) {
			throw new UnableToUpdateAccountError((error as any)?.message);
		}
		if (accountDto === undefined) {
			throw new NoSuchAccountError();
		}
		accountDto.debitBalance = debitBalance;
		accountDto.timestampLastJournalEntry = timeStampLastJournalEntry;
	}
}
