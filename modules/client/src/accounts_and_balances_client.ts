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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import axios, {AxiosInstance, AxiosResponse, AxiosError} from "axios";
import {
	UnableToCreateAccountError,
	UnableToCreateJournalEntriesError,
	UnableToGetAccountError,
	UnableToGetAccountsError,
	UnableToGetJournalEntriesError
} from "./errors";
import {IAccountDTO, IJournalEntryDTO} from "./types";

// TODO: put error-handling code inside a function to avoid repetition? securityContext.
export class AccountsAndBalancesClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly httpClient: AxiosInstance;
	private readonly UNABLE_TO_REACH_SERVER_ERROR_MESSAGE: string = "unable to reach server";

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

	async createAccount(account: IAccountDTO, bearerToken: string): Promise<string> { // TODO: bearer token name.
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post(
				"/accounts",
				account,
				{
					headers: {
						"Authorization": `Bearer ${bearerToken}`
					}
				}
			);
			return axiosResponse.data.accountId;
		} catch (e: unknown) {
			if (axios.isAxiosError(e)) {
				const axiosError: AxiosError = e as AxiosError;
				if (axiosError.response !== undefined) {
					throw new UnableToCreateAccountError((axiosError.response.data as any).message);
				}
				throw new UnableToCreateAccountError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
			}
			throw new UnableToCreateAccountError((e as any)?.message);
		}
	}

	async createJournalEntries(journalEntries: IJournalEntryDTO[], bearerToken: string): Promise<string[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post(
				"/journalEntries",
				journalEntries,
				{
					headers: {
						"Authorization": `Bearer ${bearerToken}`
					}
				}
			);
			return axiosResponse.data.idsJournalEntries;
		} catch (e: unknown) {
			if (axios.isAxiosError(e)) {
				const axiosError: AxiosError = e as AxiosError;
				if (axiosError.response !== undefined) {
					throw new UnableToCreateJournalEntriesError((axiosError.response.data as any).message);
				}
				throw new UnableToCreateJournalEntriesError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
			}
			throw new UnableToCreateJournalEntriesError((e as any)?.message);
		}
	}

	async getAccountById(accountId: string, bearerToken: string): Promise<IAccountDTO | null> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/accounts?id=${accountId}`,
				{
					headers: {
						"Authorization": `Bearer ${bearerToken}`
					},
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					}
				}
			);
			if (axiosResponse.status === 404) {
				return null;
			}
			return axiosResponse.data.account;
		} catch (e: unknown) {
			if (axios.isAxiosError(e)) {
				const axiosError: AxiosError = e as AxiosError;
				if (axiosError.response !== undefined) {
					throw new UnableToGetAccountError((axiosError.response.data as any).message);
				}
				throw new UnableToGetAccountError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
			}
			throw new UnableToGetAccountError((e as any)?.message);
		}
	}

	async getAccountsByExternalId(externalId: string, bearerToken: string): Promise<IAccountDTO[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/accounts?externalId=${externalId}`,
				{
					headers: {
						"Authorization": `Bearer ${bearerToken}`
					},
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					}
				}
			);
			if (axiosResponse.status === 404) {
				return [];
			}
			return axiosResponse.data.accounts;
		} catch (e: unknown) {
			if (axios.isAxiosError(e)) {
				const axiosError: AxiosError = e as AxiosError;
				if (axiosError.response !== undefined) {
					throw new UnableToGetAccountsError((axiosError.response.data as any).message);
				}
				throw new UnableToGetAccountsError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
			}
			throw new UnableToGetAccountsError((e as any)?.message);
		}
	}

	async getJournalEntriesByAccountId(accountId: string, bearerToken: string): Promise<IJournalEntryDTO[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/journalEntries?accountId=${accountId}`,
				{
					headers: {
						"Authorization": `Bearer ${bearerToken}`
					},
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					}
				}
			);
			if (axiosResponse.status === 404) {
				return [];
			}
			return axiosResponse.data.journalEntries;
		} catch (e: unknown) {
			if (axios.isAxiosError(e)) {
				const axiosError: AxiosError = e as AxiosError;
				if (axiosError.response !== undefined) {
					throw new UnableToGetJournalEntriesError((axiosError.response.data as any).message);
				}
				throw new UnableToGetJournalEntriesError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
			}
			throw new UnableToGetJournalEntriesError((e as any)?.message);
		}
	}
}
