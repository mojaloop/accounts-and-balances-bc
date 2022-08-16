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
	IJournalEntry,
	JournalEntryAlreadyExistsError, NoSuchJournalEntryError
} from "../../src";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class MemoryJournalEntriesRepo implements IJournalEntriesRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly journalEntries: Map<string, IJournalEntry>;

	constructor(
		logger: ILogger,
		DB_URL: string,
		DB_NAME: string,
		COLLECTION_NAME: string
	) {
		this.logger = logger;
		this.DB_URL = DB_URL;
		this.DB_NAME = DB_NAME;
		this.COLLECTION_NAME = COLLECTION_NAME;

		this.journalEntries = new Map<string, IJournalEntry>();
	}

	async init(): Promise<void> {
	}

	async destroy(): Promise<void> {
	}

	async journalEntryExistsById(journalEntryId: string): Promise<boolean> {
		return this.journalEntries.has(journalEntryId);
	}

	async storeNewJournalEntry(journalEntry: IJournalEntry): Promise<void> {
		if (this.journalEntries.has(journalEntry.id)) {
			throw new JournalEntryAlreadyExistsError();
		}
		this.journalEntries.set(journalEntry.id, journalEntry);
	}

	async getJournalEntryById(journalEntryId: string): Promise<IJournalEntry | null> {
		return this.journalEntries.get(journalEntryId) ?? null;
	}

	async getAllJournalEntries(): Promise<IJournalEntry[]> {
		return [...this.journalEntries.values()];
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntry[]> {
		const journalEntries: IJournalEntry[] = [];
		this.journalEntries.forEach(journalEntry => {
			if (journalEntry.creditedAccountId === accountId
				|| journalEntry.debitedAccountId === accountId) {
				journalEntries.push(journalEntry);
			}
		})
		return journalEntries;
	}

	async deleteJournalEntryById(journalEntryId: string): Promise<void> {
		if (!this.journalEntries.delete(journalEntryId)) {
			throw new NoSuchJournalEntryError();
		}
	}

	async deleteAllJournalEntries(): Promise<void> {
		this.journalEntries.clear();
	}
}
