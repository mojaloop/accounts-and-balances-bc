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

export class AccountsAndBalancesServiceMock {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly ACCOUNTS_AND_BALANCES_URL: string;
	// Other properties.
	public static readonly NON_EXISTENT_ACCOUNT_ID: string = "a";
	public static readonly EXISTENT_ACCOUNT_ID: string = "b";
	public static readonly NON_EXISTENT_JOURNAL_ENTRY_ID: string = "c";
	public static readonly EXISTENT_JOURNAL_ENTRY_ID: string = "d";
	public static readonly NON_EXISTENT_EXTERNAL_ID: string = "e";
	public static readonly EXISTENT_EXTERNAL_ID: string = "f";
	public static readonly ID_ACCOUNT_A: string = "account_a";
	public static readonly ID_ACCOUNT_B: string = "account_b";
	public static readonly ID_JOURNAL_ENTRY_A: string = "journal_entry_a";
	public static readonly ID_JOURNAL_ENTRY_B: string = "journal_entry_b";

	constructor(
		logger: ILogger,
		ACCOUNTS_AND_BALANCES_URL: string
	) {
		this.logger = logger;
		this.ACCOUNTS_AND_BALANCES_URL = ACCOUNTS_AND_BALANCES_URL;

		this.setUp();
	}

	setUp(): void {
		// Create account.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.post("/accounts")
			.reply(
				(_, requestBody: any) => {
					if (requestBody.id === AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID) {
						return [
							400,
							{
								result: "ERROR",
								data: {
									message: "account already exists"
								}
							}
						];
					}
					return [
						200,
						{
							result: "SUCCESS",
							data: {
								accountId: requestBody.id
							}
						}
					];
				}
			);

		// Create journal entries.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.post("/journalEntries")
			.reply(
				(_, requestBody: any) => {
					const idsJournalEntries: string[] = [];
					for (const journalEntry of requestBody) {
						if (journalEntry.id === AccountsAndBalancesServiceMock.EXISTENT_JOURNAL_ENTRY_ID) {
							return [
								400,
								{
									result: "ERROR",
									data: {
										message: "journal entry already exists"
									}
								}
							];
						}
						idsJournalEntries.push(journalEntry.id);
					}
					return [
						200,
						{
							result: "SUCCESS",
							data: {
								idsJournalEntries: idsJournalEntries
							}
						}
					];
				}
			);

		// Get non-existent account by id.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.get("/accounts")
			.query({id: AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID})
			.reply(
				404,
				{
					result: "ERROR",
					data: {
						message: "no such account"
					}
				}
			);
		// Get existent account by id.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.get("/accounts")
			.query({id: AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID})
			.reply(
				200,
				{
					result: "SUCCESS",
					data: {
						account: {
							id: AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID
						}
					}
				}
			);

		// Get non-existent accounts by external id.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.get("/accounts")
			.query({externalId: AccountsAndBalancesServiceMock.NON_EXISTENT_EXTERNAL_ID})
			.reply(
				200,
				{
					result: "SUCCESS",
					data: {
						accounts: []
					}
				}
			);
		// Get existent accounts by external id.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.get("/accounts")
			.query({externalId: AccountsAndBalancesServiceMock.EXISTENT_EXTERNAL_ID})
			.reply(
				200,
				{
					result: "SUCCESS",
					data: {
						accounts: [
							{
								id: AccountsAndBalancesServiceMock.ID_ACCOUNT_A
							},
							{
								id: AccountsAndBalancesServiceMock.ID_ACCOUNT_B
							}
						]
					}
				}
			);

		// Get non-existent journal entries by account id.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.get("/journalEntries")
			.query({accountId: AccountsAndBalancesServiceMock.NON_EXISTENT_ACCOUNT_ID})
			.reply(
				200,
				{
					result: "SUCCESS",
					data: {
						journalEntries: []
					}
				}
			);
		// Get existent journal entries by account id.
		nock(this.ACCOUNTS_AND_BALANCES_URL)
			.persist()
			.get("/journalEntries")
			.query({accountId: AccountsAndBalancesServiceMock.EXISTENT_ACCOUNT_ID})
			.reply(
				200,
				{
					result: "SUCCESS",
					data: {
						journalEntries: [
							{
								id: AccountsAndBalancesServiceMock.ID_JOURNAL_ENTRY_A
							},
							{
								id: AccountsAndBalancesServiceMock.ID_JOURNAL_ENTRY_B
							}
						]
					}
				}
			);
	}
}
