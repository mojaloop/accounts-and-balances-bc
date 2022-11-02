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

// TODO: here?

export const MONGO_ACCOUNT_SCHEMA: any = {
	bsonType: "object",
	title: "Mongo Account Schema",
	required: [
		"_id",
		"externalId",
		"state",
		"type",
		"currencyCode",
		"currencyDecimals",
		"debitBalance",
		"creditBalance",
		"timestampLastJournalEntry"
	],
	properties: {
		// TODO: type vs bsonType; binData BSON type; check if _id can be replaced.
		_id: {/*type: "string",*/ bsonType: "string"},
		externalId: {/*type: ["string", "null"],*/ bsonType: ["string", "null"]},
		state: {/*type: "string",*/ bsonType: "string"},
		type: {/*type: "string",*/ bsonType: "string"},
		currencyCode: {/*type: "string",*/ bsonType: "string"},
		currencyDecimals: {/*type: "number",*/ bsonType: "int"},
		debitBalance: {/*type: "string",*/ bsonType: "string"},
		creditBalance: {/*type: "string",*/ bsonType: "string"},
		timestampLastJournalEntry: {/*type: ["number", "null"],*/ bsonType: ["number", "null"]} // TODO: long.
	},
	additionalProperties: false
};

export const MONGO_JOURNAL_ENTRY_SCHEMA: any = {
	bsonType: "object",
	title: "Mongo Journal Entry Schema",
	required: [
		"_id",
		"externalId",
		"externalCategory",
		"currencyCode",
		"currencyDecimals",
		"amount",
		"debitedAccountId",
		"creditedAccountId",
		"timestamp"
	],
	properties: {
		_id: {bsonType: "string"},
		externalId: {bsonType: ["string", "null"]},
		externalCategory: {bsonType: ["string", "null"]},
		currencyCode: {bsonType: "string"},
		currencyDecimals: {bsonType: "int"},
		amount: {bsonType: "string"},
		debitedAccountId: {bsonType: "string"},
		creditedAccountId: {bsonType: "string"},
		timestamp: {bsonType: "number"} // TODO: long.
	},
	additionalProperties: false
};
