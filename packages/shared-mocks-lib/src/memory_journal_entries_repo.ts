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
	IJournalEntriesRepo,
	JournalEntryAlreadyExistsError,
	UnableToGetJournalEntriesError,
	UnableToGetJournalEntryError,
	UnableToStoreJournalEntryError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class MemoryJournalEntriesRepo implements IJournalEntriesRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly journalEntries: Map<string, IJournalEntryDto>;

	constructor(logger: ILogger) {
		this.logger = logger;

		this.journalEntries = new Map<string, IJournalEntryDto>();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

	async journalEntryExistsById(journalEntryId: string): Promise<boolean> {
		try {
			const journalEntryExists: boolean = this.journalEntries.has(journalEntryId);
			return journalEntryExists;
		} catch (error: unknown) {
			throw new UnableToGetJournalEntryError();
		}
	}

	async storeNewJournalEntry(journalEntryDto: IJournalEntryDto): Promise<void> {
		if (
			journalEntryDto.id === null
			|| journalEntryDto.currencyDecimals === null
			|| journalEntryDto.timestamp === null
		) {
			throw new UnableToStoreJournalEntryError("journal entry id or currency decimals or timestamp null"); // TODO: error message.
		}
		let journalEntryExists: boolean;
		try {
			journalEntryExists = this.journalEntries.has(journalEntryDto.id);
		} catch (error: unknown) {
			throw new UnableToStoreJournalEntryError();
		}
		if (journalEntryExists) {
			throw new JournalEntryAlreadyExistsError();
		}
		try {
			this.journalEntries.set(journalEntryDto.id, journalEntryDto);
		} catch (error: unknown) {
			throw new UnableToStoreJournalEntryError();
		}
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDto[]> {
		const journalEntryDtos: IJournalEntryDto[] = [];
		try {
			for (const journalEntryDto of this.journalEntries.values()) {
				if (journalEntryDto.creditedAccountId === accountId
					|| journalEntryDto.debitedAccountId === accountId) {
					journalEntryDtos.push(journalEntryDto);
				}
			}
		} catch (error: unknown) {
			throw new UnableToGetJournalEntriesError();
		}
		return journalEntryDtos;
	}
}
