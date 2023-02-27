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


import {join} from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {LoginHelper} from "@mojaloop/security-bc-client-lib";
import {
	BuiltinLedgerGrpcCreateIdsResponse__Output
} from "./types/proto-gen/BuiltinLedgerGrpcCreateIdsResponse";
import {
	BuiltinLedgerGrpcCreateJournalEntryArray
} from "./types/proto-gen/BuiltinLedgerGrpcCreateJournalEntryArray";
import {
	BuiltinLedgerGrpcAccountArray__Output,
	BuiltinLedgerGrpcId,
	BuiltinLedgerGrpcIdArray,
	BuiltinLedgerGrpcJournalEntryArray__Output,
	GrpcBuiltinLedgerClient,
	ProtoGrpcType
} from "./types";
import { BuiltinLedgerGrpcCreateAccountArray } from "./types/proto-gen/BuiltinLedgerGrpcCreateAccountArray";


const PROTO_FILE_NAME = "builtin_ledger.proto";
const LOAD_PROTO_OPTIONS: protoLoader.Options = {
	longs: Number
};
const TIMEOUT_MS: number = 5_000;

export class BuiltinLedgerGrpcClient {
	private readonly _logger: ILogger;
	private readonly _callMetadata: grpc.Metadata;
	private readonly _loginHelper: LoginHelper;
	private readonly _client: GrpcBuiltinLedgerClient;
	private readonly _url: string;

	constructor(url: string, loginHelper: LoginHelper, logger: ILogger) {
		this._logger = logger.createChild(this.constructor.name);
		this._loginHelper = loginHelper;
		this._url = url;

		const protoFileAbsolutePath: string = join(__dirname, PROTO_FILE_NAME);
		const packageDefinition: protoLoader.PackageDefinition = protoLoader.loadSync(
			protoFileAbsolutePath,
			LOAD_PROTO_OPTIONS
		);
		const grpcObject: grpc.GrpcObject = grpc.loadPackageDefinition(packageDefinition);

		this._callMetadata = new grpc.Metadata();
		this._client = new (grpcObject as unknown as ProtoGrpcType).GrpcBuiltinLedger(
			this._url,
			grpc.credentials.createInsecure()
		);
	}

	private async _updateCallMetadata(): Promise<void> {
		// this can throw and UnauthorizedError, let it
		const token = await this._loginHelper.getToken();
		//this._callMetadata.remove("TOKEN");
		this._callMetadata.set("TOKEN", token.accessToken);
		return Promise.resolve();
	}

	async init(): Promise<void> {
		// we don't use credentials here, but want to try fetching a token to fail early
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._logger.info(`Connecting BuiltinLedgerGrpcClient to url: ${this._url}`);

			const deadline: grpc.Deadline = Date.now() + TIMEOUT_MS;
			this._client.waitForReady(deadline, (error) => {
				if (error) return reject(error);

				this._logger.info("BuiltinLedgerGrpcClient client initialized");
				resolve();
			});
		});
	}

	async destroy(): Promise<void> {
		this._client.close();
		this._logger.info("gRPC client destroyed 🏁");
	}

	async createAccounts(accountCreates: BuiltinLedgerGrpcCreateAccountArray): Promise<BuiltinLedgerGrpcCreateIdsResponse__Output> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createAccounts(accountCreates, this._callMetadata, (error, idsResponse) => {
				if (error || !idsResponse) return reject(error);
				resolve(idsResponse);
				}
			);
		});
	}

	async createJournalEntries(entryCreates: BuiltinLedgerGrpcCreateJournalEntryArray): Promise<BuiltinLedgerGrpcCreateIdsResponse__Output> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.createJournalEntries(entryCreates, this._callMetadata, (error, idsResponse) => {
					if (error || !idsResponse) return reject(error);
					resolve(idsResponse);
				}
			);
		});
	}

	async getAccountsByIds(accountIds: BuiltinLedgerGrpcIdArray): Promise<BuiltinLedgerGrpcAccountArray__Output> {
		await this._updateCallMetadata();

		return new Promise( (resolve, reject) => {
			this._client.getAccountsByIds(accountIds, this._callMetadata, (error, resp) => {
					if (error || !resp) return reject(error);
					resolve(resp);
				}
			);
		});
	}

	async getJournalEntriesByAccountId(accountId: BuiltinLedgerGrpcId): Promise<BuiltinLedgerGrpcJournalEntryArray__Output> {
		await this._updateCallMetadata();

		return new Promise( (resolve, reject) => {
			this._client.getJournalEntriesByAccountId(accountId, this._callMetadata, (error, resp) => {
				if (error || !resp) return reject(error);
				resolve(resp);
			});
		});
	}

	async deleteAccountsByIds(accountsArray: BuiltinLedgerGrpcIdArray): Promise<void> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.deleteAccountsByIds(accountsArray, this._callMetadata, (error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async deactivateAccountsByIds(accountsArray: BuiltinLedgerGrpcIdArray): Promise<void> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.deactivateAccountsByIds(accountsArray, this._callMetadata,(error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}

	async activateAccountsByIds(accountsArray: BuiltinLedgerGrpcIdArray	): Promise<void> {
		await this._updateCallMetadata();

		return new Promise((resolve, reject) => {
			this._client.activateAccountsByIds(accountsArray, this._callMetadata,(error) => {
				if (error) return reject(error);
				resolve();
			});
		});
	}
}
