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

import {BuiltinLedgerJournalEntry} from "../../src/domain/entities";
import {
	JournalEntryAlreadyExistsError,
	UnableToGetJournalEntriesError,
	UnableToStoreJournalEntryError
} from "../../src/domain/errors";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IBuiltinLedgerJournalEntriesRepo} from "../../src/domain/infrastructure";

export class BuiltinLedgerJournalEntriesMemoryRepo implements IBuiltinLedgerJournalEntriesRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly journalEntries: Map<string, BuiltinLedgerJournalEntry>;

	constructor(logger: ILogger) {
		//this.logger = logger;

		this.journalEntries = new Map();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

	async storeNewJournalEntry(builtinLedgerJournalEntry: BuiltinLedgerJournalEntry): Promise<void> {
		let journalEntryExists: boolean;
		try {
			journalEntryExists = this.journalEntries.has(builtinLedgerJournalEntry.id);
		} catch (error: unknown) {
			throw new UnableToStoreJournalEntryError();
		}
		if (journalEntryExists) {
			throw new JournalEntryAlreadyExistsError();
		}
		try {
			this.journalEntries.set(builtinLedgerJournalEntry.id, builtinLedgerJournalEntry);
		} catch (error: unknown) {
			throw new UnableToStoreJournalEntryError();
		}
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<BuiltinLedgerJournalEntry[]> {
		const builtinLedgerJournalEntries: BuiltinLedgerJournalEntry[] = [];
		try {
			for (const builtinLedgerJournalEntry of this.journalEntries.values()) {
				if (builtinLedgerJournalEntry.debitedAccountId === accountId
					|| builtinLedgerJournalEntry.creditedAccountId === accountId) {
					builtinLedgerJournalEntries.push(builtinLedgerJournalEntry);
				}
			}
		} catch (error: unknown) {
			throw new UnableToGetJournalEntriesError();
		}
		return builtinLedgerJournalEntries;
	}
}
