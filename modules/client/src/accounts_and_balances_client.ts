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
	UnableToGetJournalEntriesError,
	UnableToReachServerError
} from "./errors";
import {IAccountDTO, IJournalEntryDTO, IResponse} from "./types";

export class AccountsAndBalancesClient {
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

	// TODO: change axios error!!!

	async createAccount(account: IAccountDTO): Promise<string> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post("/accounts", account);
			// axiosResponse.data can only be an IResponse.
			const serverSuccessResponse: IResponse = axiosResponse.data;
			return serverSuccessResponse.data.accountId;
		} catch (e: unknown) { // TODO.
			const axiosError: AxiosError = e as AxiosError; // e can only be an AxiosError.
			if (axiosError.response === undefined) {
				this.logger.error(e);
				throw new UnableToReachServerError();
			}
			// axiosError.response.data can only be an IResponse.
			const serverErrorResponse: IResponse = axiosError.response.data as IResponse;
			throw new UnableToCreateAccountError(serverErrorResponse.data.message);
		}
	}

	async createJournalEntries(journalEntries: IJournalEntryDTO[]): Promise<string[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.post("/journalEntries", journalEntries);
			// axiosResponse.data can only be an IResponse.
			const serverSuccessResponse: IResponse = axiosResponse.data;
			return serverSuccessResponse.data.idsJournalEntries;
		} catch (e: unknown) {
			const axiosError: AxiosError = e as AxiosError; // e can only be an AxiosError.
			if (axiosError.response === undefined) {
				this.logger.error(e);
				throw new UnableToReachServerError();
			}
			// axiosError.response.data can only be an IResponse.
			const serverErrorResponse: IResponse = axiosError.response.data as IResponse;
			throw new UnableToCreateJournalEntriesError(serverErrorResponse.data.message);
		}
	}

	async getAccountById(accountId: string): Promise<IAccountDTO | null> {
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
			// axiosResponse.data can only be an IResponse.
			const serverSuccessResponse: IResponse = axiosResponse.data;
			return serverSuccessResponse.data.account;
		} catch (e: unknown) {
			const axiosError: AxiosError = e as AxiosError; // e can only be an AxiosError.
			if (axiosError.response === undefined) {
				this.logger.error(e);
				throw new UnableToReachServerError();
			}
			// axiosError.response.data can only be an IResponse.
			const serverErrorResponse: IResponse = axiosError.response.data as IResponse;
			throw new UnableToGetAccountError(serverErrorResponse.data.message);
		}
	}

	async getAccountsByExternalId(externalId: string): Promise<IAccountDTO[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/accounts?externalId=${externalId}`
			);
			// axiosResponse.data can only be an IResponse.
			const serverSuccessResponse: IResponse = axiosResponse.data;
			return serverSuccessResponse.data.accounts;
		} catch (e: unknown) {
			const axiosError: AxiosError = e as AxiosError; // e can only be an AxiosError.
			if (axiosError.response === undefined) {
				this.logger.error(e);
				throw new UnableToReachServerError();
			}
			// axiosError.response.data can only be an IResponse.
			const serverErrorResponse: IResponse = axiosError.response.data as IResponse;
			throw new UnableToGetAccountsError(serverErrorResponse.data.message);
		}
	}

	async getJournalEntriesByAccountId(accountId: string): Promise<IJournalEntryDTO[]> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`/journalEntries?accountId=${accountId}`
			);
			// axiosResponse.data can only be an IResponse.
			const serverSuccessResponse: IResponse = axiosResponse.data;
			return serverSuccessResponse.data.journalEntries;
		} catch (e: unknown) {
			const axiosError: AxiosError = e as AxiosError; // e can only be an AxiosError.
			if (axiosError.response === undefined) {
				this.logger.error(e);
				throw new UnableToReachServerError();
			}
			// axiosError.response.data can only be an IResponse.
			const serverErrorResponse: IResponse = axiosError.response.data as IResponse;
			throw new UnableToGetJournalEntriesError(serverErrorResponse.data.message);
		}
	}
}
