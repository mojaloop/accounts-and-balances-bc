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

import nock from "nock";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class RestServiceMock {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly BASE_URL: string;
	// Other properties.
	static readonly NON_EXISTENT_ACCOUNT_ID: string = "a";
	static readonly EXISTENT_ACCOUNT_ID: string = "b";
	static readonly NON_EXISTENT_JOURNAL_ENTRY_ID: string = "c";
	static readonly EXISTENT_JOURNAL_ENTRY_ID: string = "d";
	static readonly NON_EXISTENT_EXTERNAL_ID: string = "e";
	static readonly EXISTENT_EXTERNAL_ID: string = "f";
	static readonly ID_INTERNAL_SERVER_ERROR: string = "g";
	static readonly ID_ACCOUNT_A: string = "account_a";
	static readonly ID_ACCOUNT_B: string = "account_b";
	static readonly ID_JOURNAL_ENTRY_A: string = "journal_entry_a";
	static readonly ID_JOURNAL_ENTRY_B: string = "journal_entry_b";
	static readonly VALID_ACCESS_TOKEN: string = "";

	constructor(
		logger: ILogger,
		host: string,
		portNo: number
	) {
		this.logger = logger.createChild(this.constructor.name);
		this.BASE_URL = `http://${host}:${portNo}`;

		this.setUp();
	}

	private setUp(): void {
		// Create account.
		nock(this.BASE_URL)
			.persist()
			.post("/accounts")
			.reply(
				(_, requestBody: any) => {
					if (requestBody.id === RestServiceMock.EXISTENT_ACCOUNT_ID) {
						return [
							409,
							{message: "account already exists"}
						];
					}
					return [
						201,
						{accountId: requestBody.id}
					];
				}
			);

		// Create journal entries.
		nock(this.BASE_URL)
			.persist()
			.post("/journalEntries")
			.reply(
				(_, requestBody: any) => {
					const idsJournalEntries: string[] = [];
					for (const journalEntry of requestBody) {
						if (journalEntry.id === RestServiceMock.EXISTENT_JOURNAL_ENTRY_ID) {
							return [
								409,
								{message: "journal entry already exists"}
							];
						}
						idsJournalEntries.push(journalEntry.id);
					}
					return [
						201,
						{idsJournalEntries: idsJournalEntries}
					];
				}
			);

		// Get non-existent account by id.
		nock(this.BASE_URL)
			.persist()
			.get("/accounts")
			.query({id: RestServiceMock.NON_EXISTENT_ACCOUNT_ID})
			.reply(
				404,
				{message: "no such account"}
			);
		// Get existent account by id.
		nock(this.BASE_URL)
			.persist()
			.get("/accounts")
			.query({id: RestServiceMock.EXISTENT_ACCOUNT_ID})
			.reply(
				200,
				{account: {id: RestServiceMock.EXISTENT_ACCOUNT_ID}}
			);
		// Get account with internal server error.
		nock(this.BASE_URL)
			.persist()
			.get("/accounts")
			.query({id: RestServiceMock.ID_INTERNAL_SERVER_ERROR})
			.reply(
				500,
				{message: "unknown error"}
			);

		// Get non-existent accounts by external id.
		nock(this.BASE_URL)
			.persist()
			.get("/accounts")
			.query({externalId: RestServiceMock.NON_EXISTENT_EXTERNAL_ID})
			.reply(
				404,
				{message: "no accounts with the specified external id"}
			);
		// Get existent accounts by external id.
		nock(this.BASE_URL)
			.persist()
			.get("/accounts")
			.query({externalId: RestServiceMock.EXISTENT_EXTERNAL_ID})
			.reply(
				200,
				{
					accounts: [
						{id: RestServiceMock.ID_ACCOUNT_A},
						{id: RestServiceMock.ID_ACCOUNT_B}
					]
				}
			);
		// Get accounts with internal server error.
		nock(this.BASE_URL)
			.persist()
			.get("/accounts")
			.query({externalId: RestServiceMock.ID_INTERNAL_SERVER_ERROR})
			.reply(
				500,
				{message: "unknown error"}
			);

		// Get non-existent journal entries by account id.
		nock(this.BASE_URL)
			.persist()
			.get("/journalEntries")
			.query({accountId: RestServiceMock.NON_EXISTENT_ACCOUNT_ID})
			.reply(
				404,
				{message: "no journal entries with the specified account id"}
			);
		// Get existent journal entries by account id.
		nock(this.BASE_URL)
			.persist()
			.get("/journalEntries")
			.query({accountId: RestServiceMock.EXISTENT_ACCOUNT_ID})
			.reply(
				200,
				{
					journalEntries: [
						{id: RestServiceMock.ID_JOURNAL_ENTRY_A},
						{id: RestServiceMock.ID_JOURNAL_ENTRY_B}
					]
				}
			);
		// Get journal entries with internal server error.
		nock(this.BASE_URL)
			.persist()
			.get("/journalEntries")
			.query({accountId: RestServiceMock.ID_INTERNAL_SERVER_ERROR})
			.reply(
				500,
				{message: "unknown error"}
			);
	}

	disable(): void {
		nock.restore();
	}

	enable(): void {
		nock.activate();
	}
}
