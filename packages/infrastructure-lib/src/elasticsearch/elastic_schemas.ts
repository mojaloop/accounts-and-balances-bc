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

// TODO:
//  - here?
//  - verify if the id can be part of the schema;
//  - investigate default values and nulls;
//  - make properties required (maybe they already are, with default values);
//  - investigate keyword type.

export const ELASTIC_ACCOUNT_SCHEMA: any = {
	dynamic: "strict",
	properties: {
		// Numeric properties can be null.
		externalId: {type: "text"}, // Or null.
		state: {type: "text"},
		type: {type: "text"},
		currencyCode: {type: "text"},
		currencyDecimals: {type: "byte"},
		debitBalance: {type: "text"},
		creditBalance: {type: "text"},
		timestampLastJournalEntry: {type: "unsigned_long"} // Or null.
	}
};

export const ELASTIC_JOURNAL_ENTRY_SCHEMA: any = {
	dynamic: "strict",
	properties: {
		externalId: {type: "text"}, // Or null.
		externalCategory: {type: "text"}, // Or null.
		currencyCode: {type: "text"},
		currencyDecimals: {type: "byte"},
		amount: {type: "text"},
		debitedAccountId: {type: "text"},
		creditedAccountId: {type: "text"},
		timestamp: {type: "unsigned_long"} // Or null.
	}
};
