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

import {loadProto} from "../../src";

describe("accounts and balances gRPC common lib - unit tests", () => {
	beforeAll(async () => {
	});

	afterAll(async () => {
	});

	test("loadProto()", async () => {
		expect(
			() => {
				loadProto();
			}
		).not.toThrow();
	});

	/*test("accountDtoToGrpcAccount()", async () => {
		const accountDto: IAccountDto = {
			id: null,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: null,
			debitBalance: "20",
			creditBalance: "99",
			timestampLastJournalEntry: null
		};

		const grpcAccount: GrpcAccount = accountDtoToGrpcAccount(accountDto);

		expect(grpcAccount).toEqual({
			id: undefined,
			externalId: undefined,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: undefined,
			debitBalance: "20",
			creditBalance: "99",
			timestampLastJournalEntry: undefined
		});
	});

	test("grpcAccountOutputToAccountDto()", async () => {
		const grpcAccountOutput: GrpcAccount__Output = {
			id: undefined,
			externalId: undefined,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: undefined,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: undefined
		};

		const accountDto: IAccountDto = grpcAccountOutputToAccountDto(grpcAccountOutput);

		expect(accountDto).toEqual({
			id: null,
			externalId: null,
			state: AccountState.ACTIVE,
			type: AccountType.POSITION,
			currencyCode: "EUR",
			currencyDecimals: null,
			debitBalance: "0",
			creditBalance: "0",
			timestampLastJournalEntry: null
		});
	});

	test("grpcAccountOutputToAccountDto() with all properties undefined", async () => {
		const grpcAccountOutput: GrpcAccount__Output = {
			id: undefined,
			externalId: undefined,
			state: undefined,
			type: undefined,
			currencyCode: undefined,
			currencyDecimals: undefined,
			debitBalance: undefined,
			creditBalance: undefined,
			timestampLastJournalEntry: undefined
		};

		expect(
			() => {
				grpcAccountOutputToAccountDto(grpcAccountOutput);
			}
		).toThrow();
	});

	test("journalEntryDtoToGrpcJournalEntry()", async () => {
		const journalEntryDto: IJournalEntryDto = {
			id: null,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: null,
			amount: "5",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: null
		};

		const grpcJournalEntry: GrpcJournalEntry = journalEntryDtoToGrpcJournalEntry(journalEntryDto);

		expect(grpcJournalEntry).toEqual({
			id: undefined,
			externalId: undefined,
			externalCategory: undefined,
			currencyCode: "EUR",
			currencyDecimals: undefined,
			amount: "5",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: undefined
		});
	});

	test("grpcJournalEntryOutputToJournalEntryDto()", async () => {
		const grpcJournalEntryOutput: GrpcJournalEntry__Output = {
			id: undefined,
			externalId: undefined,
			externalCategory: undefined,
			currencyCode: "EUR",
			currencyDecimals: undefined,
			amount: "5",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: undefined
		};

		const journalEntryDto: IJournalEntryDto = grpcJournalEntryOutputToJournalEntryDto(grpcJournalEntryOutput);

		expect(journalEntryDto).toEqual({
			id: null,
			externalId: null,
			externalCategory: null,
			currencyCode: "EUR",
			currencyDecimals: null,
			amount: "5",
			debitedAccountId: "a",
			creditedAccountId: "b",
			timestamp: null
		});
	});

	test("grpcJournalEntryOutputToJournalEntryDto() with all properties undefined", async () => {
		const grpcJournalEntryOutput: GrpcJournalEntry__Output = {
			id: undefined,
			externalId: undefined,
			externalCategory: undefined,
			currencyCode: undefined,
			currencyDecimals: undefined,
			amount: undefined,
			debitedAccountId: undefined,
			creditedAccountId: undefined,
			timestamp: undefined
		};

		expect(
			() => {
				grpcJournalEntryOutputToJournalEntryDto(grpcJournalEntryOutput);
			}
		).toThrow();
	});*/
});
