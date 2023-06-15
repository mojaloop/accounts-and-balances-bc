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

import {

	BuiltinLedgerJournalEntry,
	IBuiltinLedgerJournalEntriesRepo
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-svc/dist/domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class BuiltinLedgerJournalEntriesMockRepo implements IBuiltinLedgerJournalEntriesRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly builtinLedgerJournalEntries: Map<string, BuiltinLedgerJournalEntry>;

	constructor(logger: ILogger) {
		this.logger = logger.createChild(this.constructor.name);

		this.builtinLedgerJournalEntries = new Map();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

	async storeNewJournalEntry(builtinLedgerJournalEntry: BuiltinLedgerJournalEntry): Promise<void> {
		if (this.builtinLedgerJournalEntries.has(builtinLedgerJournalEntry.id)) {
			throw new Error();
		}
		this.builtinLedgerJournalEntries.set(builtinLedgerJournalEntry.id, builtinLedgerJournalEntry);
	}

    async storeNewJournalEntries(entries: BuiltinLedgerJournalEntry[]): Promise<void>{
        for(const entry of entries){
            await this.storeNewJournalEntry(entry);
        }
    }


    async getJournalEntry(entryId: string): Promise<BuiltinLedgerJournalEntry|null>{
        return this.builtinLedgerJournalEntries.get(entryId) || null;
    }

	async getJournalEntriesByAccountId(accountId: string): Promise<BuiltinLedgerJournalEntry[]> {
		const builtinLedgerJournalEntries: BuiltinLedgerJournalEntry[] = [];
		for (const builtinLedgerJournalEntry of this.builtinLedgerJournalEntries.values()) {
			if (builtinLedgerJournalEntry.debitedAccountId === accountId
				|| builtinLedgerJournalEntry.creditedAccountId === accountId) {
				builtinLedgerJournalEntries.push(builtinLedgerJournalEntry);
			}
		}
		return builtinLedgerJournalEntries;
	}
}
