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
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

// TODO: put error-handling code inside a function to avoid repetition?
export class AccountsAndBalancesHttpClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly httpClient: AxiosInstance;
	private readonly UNABLE_TO_REACH_SERVER_ERROR_MESSAGE: string = "unable to reach server";

	constructor(
		logger: ILogger,
		baseUrlHttpService: string,
		timeoutMs: number,
		accessToken: string
	) {
		this.logger = logger;

		this.httpClient = axios.create({
			baseURL: baseUrlHttpService,
			timeout: timeoutMs
		});
		// "headers: {"Authorization": `Bearer ${accessToken}`}" could be passed to axios.create(), but that way, due
		// to a bug, it wouldn't be possible to change the access token later.
		this.setAccessToken(accessToken);
	}

	setAccessToken(accessToken: string): void {
		this.httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
	}

	async createAccount(accountDto: IAccountDto): Promise<string> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post("/accounts", accountDto);
			return axiosResponse.data.accountId;
		} catch (error: unknown) {
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

	async createJournalEntries(journalEntryDtos: IJournalEntryDto[]): Promise<string[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post("/journalEntries", journalEntryDtos);
			return axiosResponse.data.idsJournalEntries;
		} catch (error: unknown) {
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

	async getAccountById(accountId: string): Promise<IAccountDto | null> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/accounts?id=${accountId}`,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					}
				}
			);
			if (axiosResponse.status === 404) {
				return null;
			}
			return axiosResponse.data.account;
		} catch (error: unknown) {
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

	async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/accounts?externalId=${externalId}`,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					}
				}
			);
			if (axiosResponse.status === 404) {
				return [];
			}
			return axiosResponse.data.accounts;
		} catch (error: unknown) {
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

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDto[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/journalEntries?accountId=${accountId}`,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					}
				}
			);
			if (axiosResponse.status === 404) {
				return [];
			}
			return axiosResponse.data.journalEntries;
		} catch (error: unknown) {
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
