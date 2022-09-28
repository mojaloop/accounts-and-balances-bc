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
	UnableToInitRepoError,
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
	private unexpectedFailure: boolean; // TODO: should this be done?
	private readonly journalEntries: Map<string, IJournalEntryDto>;

	constructor(logger: ILogger) {
		this.logger = logger;

		this.unexpectedFailure = false;
		this.journalEntries = new Map<string, IJournalEntryDto>();
	}

	async init(): Promise<void> {
		if (this.unexpectedFailure) {
			throw new UnableToInitRepoError();
		}
	}

	async destroy(): Promise<void> {
	}

	async journalEntryExistsById(journalEntryId: string): Promise<boolean> {
		if (this.unexpectedFailure) {
			throw new UnableToGetJournalEntryError();
		}
		return this.journalEntries.has(journalEntryId);
	}

	async storeNewJournalEntry(journalEntry: IJournalEntryDto): Promise<void> {
		if (this.unexpectedFailure) {
			throw new UnableToStoreJournalEntryError();
		}
		if (await this.journalEntryExistsById(journalEntry.id)) {
			throw new JournalEntryAlreadyExistsError();
		}
		this.journalEntries.set(journalEntry.id, journalEntry);
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDto[]> {
		if (this.unexpectedFailure) {
			throw new UnableToGetJournalEntriesError();
		}
		const journalEntries: IJournalEntryDto[] = [];
		for (const journalEntry of this.journalEntries.values()) {
			if (journalEntry.creditedAccountId === accountId
				|| journalEntry.debitedAccountId === accountId) {
				journalEntries.push(journalEntry);
			}
		}
		return journalEntries;
	}

	setUnexpectedFailure(unexpectedFailure: boolean) {
		this.unexpectedFailure = unexpectedFailure;
	}
}
