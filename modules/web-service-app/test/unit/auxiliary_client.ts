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

import axios, {AxiosError, AxiosInstance, AxiosResponse} from "axios";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class AuxiliaryClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly httpClient: AxiosInstance;

	constructor(
		logger: ILogger,
		ACCOUNTS_AND_BALANCES_URL: string,
		HTTP_CLIENT_TIMEOUT_MS: number
	) {
		this.logger = logger;

		this.httpClient = axios.create({
			baseURL: ACCOUNTS_AND_BALANCES_URL,
			timeout: HTTP_CLIENT_TIMEOUT_MS
		});
	}

	async createAccount(account: any, bearerToken: string): Promise<number> { // TODO: bearer token name.
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post(
				"/accounts",
				account,
				{
					headers: {
						"Authorization": `Basic ${bearerToken}` // TODO: Basic?
					}
				}
			);
			return axiosResponse.status;
		} catch (e: unknown) {
			return (e as AxiosError).response?.status ?? -1;
		}
	}

	async createJournalEntries(journalEntries: any[]): Promise<number> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post("/journalEntries", journalEntries);
			return axiosResponse.status;
		} catch (e: unknown) {
			return (e as AxiosError).response?.status ?? -1;
		}
	}

	async getAccountById(accountId: string): Promise<number> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(`/accounts?id=${accountId}`);
			return axiosResponse.status;
		} catch (e: unknown) {
			return (e as AxiosError).response?.status ?? -1;
		}
	}

	async getAccountsByExternalId(externalId: string): Promise<number> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(`/accounts?externalId=${externalId}`);
			return axiosResponse.status;
		} catch (e: unknown) {
			return (e as AxiosError).response?.status ?? -1;
		}
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<number> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(`/journalEntries?accountId=${accountId}`);
			return axiosResponse.status;
		} catch (e: unknown) {
			return (e as AxiosError).response?.status ?? -1;
		}
	}
}
