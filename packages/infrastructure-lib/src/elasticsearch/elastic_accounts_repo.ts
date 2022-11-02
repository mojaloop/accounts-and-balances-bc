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

import {
    AccountAlreadyExistsError,
    IAccountsRepo,
    NoSuchAccountError,
    UnableToGetAccountError,
    UnableToGetAccountsError,
    UnableToInitRepoError,
    UnableToStoreAccountError,
    UnableToUpdateAccountError
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {IAccountDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Client, errors} from "@elastic/elasticsearch";
import {GetResponse, Id, SearchResponse} from "@elastic/elasticsearch/lib/api/types";
import {ELASTIC_ACCOUNT_SCHEMA} from "./elastic_schemas";
import {readFileSync} from "fs";

export class ElasticAccountsRepo implements IAccountsRepo {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly HOST: string;
    private readonly PORT_NO: number;
    private readonly TIMEOUT_MS: number;
    private readonly USERNAME: string;
    private readonly PASSWORD: string;
    private readonly CERT_FILE_ABSOLUTE_PATH: string;
    private readonly INDEX: string;
    // Other properties.
    private client: Client;

	constructor(
        logger: ILogger,
        host: string,
        portNo: number,
        timeoutMs: number,
        username: string,
        password: string,
        certFileAbsolutePath: string,
        index: string,
    ) {
        this.logger = logger.createChild(this.constructor.name);
        this.HOST = host;
        this.PORT_NO = portNo;
        this.TIMEOUT_MS = timeoutMs;
        this.USERNAME = username;
        this.PASSWORD = password;
        this.CERT_FILE_ABSOLUTE_PATH = certFileAbsolutePath;
        this.INDEX = index;
	}

    // TODO: make sure init is called.
	async init(): Promise<void> {
        // TODO: set a fixed index for the client so that it doesn't need to be specified on every operation.

        try {
            // TODO: should this be here given that it isn't async (I did it bc of the UnableToInit error)?
            const ca: Buffer = readFileSync(this.CERT_FILE_ABSOLUTE_PATH);
            this.client = new Client({
                node: `https://${this.HOST}:${this.PORT_NO}`,
                requestTimeout: this.TIMEOUT_MS,
                tls: {ca: ca},
                auth: {
                    username: this.USERNAME,
                    password: this.PASSWORD
                }
            });

            if (await this.client.indices.exists({index: this.INDEX})) {
                return;
            }

            await this.client.indices.create({
                    index: this.INDEX,
                    mappings: ELASTIC_ACCOUNT_SCHEMA
            });
        } catch (error: unknown) {
            throw new UnableToInitRepoError((error as any)?.message);
        }
    }

    async destroy(): Promise<void> {
        await this.client.close(); // Doesn't throw if the server is unreachable.
    }

    async accountExistsById(accountId: string): Promise<boolean> {
        try {
            const accountExists: boolean = await this.client.exists({
                index: this.INDEX,
                id: accountId
            });
            return accountExists;
        } catch (error: unknown) {
            throw new UnableToGetAccountError((error as any)?.message);
        }
    }

    async storeNewAccount(accountDto: IAccountDto): Promise<void> {
        const accountDtoCopyWithoutId: any = {
            externalId: accountDto.externalId,
            state: accountDto.state,
            type: accountDto.type,
            currencyCode: accountDto.currencyCode,
            currencyDecimals: accountDto.currencyDecimals,
            debitBalance: accountDto.debitBalance,
            creditBalance: accountDto.creditBalance,
            timestampLastJournalEntry: accountDto.timestampLastJournalEntry
        };

        try {
            // create() doesn't allow for duplicates.
            await this.client.create({
                index: this.INDEX,
                id: accountDto.id as Id,
                document: accountDtoCopyWithoutId
            });
        } catch (error: unknown) {
            if (error instanceof errors.ResponseError && error.statusCode === 409) { // TODO: should this be done?
            // if ((error as errors.ResponseError)?.statusCode === 409) {}
                throw new AccountAlreadyExistsError();
            }
            throw new UnableToStoreAccountError((error as any)?.message);
        }
    }

    async getAccountById(accountId: string): Promise<IAccountDto | null> {
        try {
            // get() throws if no item is found.
            const getResponse: GetResponse = await this.client.get({
                index: this.INDEX,
                id: accountId
            });

            const accountDtoWithoutId: any = getResponse._source;
            const accountDto: IAccountDto = {
                id: getResponse._id,
                ...accountDtoWithoutId
            };
            return accountDto;
        } catch (error: unknown) {
            if (error instanceof errors.ResponseError && error.statusCode === 404) { // TODO: should this be done?
            // if ((error as errors.ResponseError)?.statusCode === 404) {}
                return null;
            }
            throw new UnableToGetAccountError((error as any)?.message);
        }
    }

    async getAccountsByExternalId(externalId: string): Promise<IAccountDto[]> {
        try {
            // search() doesn't throw if no items are found.
            const searchResponse: SearchResponse = await this.client.search({
                index: this.INDEX,
                body: {
                    query: {
                        match: {externalId: externalId}
                    }
                }
            });

            const accountDtos: IAccountDto[] = searchResponse.hits.hits.map((hit) => {
                const accountDtoWithoutId: any = hit._source;
                return {
                    id: hit._id,
                    ...accountDtoWithoutId
                };
            });
            return accountDtos;
        } catch (error: unknown) {
            throw new UnableToGetAccountsError((error as any)?.message);
        }
    }

    async updateAccountDebitBalanceAndTimestampById(
        accountId: string,
        debitBalance: string,
        timestampLastJournalEntry: number
    ): Promise<void> {
        try {
            // update() throws if no item is found.
            await this.client.update({
                index: this.INDEX,
                id: accountId,
                body: {
                    doc: {
                        debitBalance: debitBalance,
                        timestampLastJournalEntry: timestampLastJournalEntry
                    }
                }
            });
        } catch (error: unknown) {
            if (error instanceof errors.ResponseError && error.statusCode === 404) { // TODO: should this be done?
            // if ((error as errors.ResponseError)?.statusCode === 404) {}
                throw new NoSuchAccountError();
            }
            throw new UnableToUpdateAccountError((error as any)?.message);
        }
    }

    async updateAccountCreditBalanceAndTimestampById(
        accountId: string,
        creditBalance: string,
        timestampLastJournalEntry: number
    ): Promise<void> {
        try {
            // update() throws if no item is found.
            await this.client.update({
                index: this.INDEX,
                id: accountId,
                body: {
                    doc: {
                        creditBalance: creditBalance,
                        timestampLastJournalEntry: timestampLastJournalEntry
                    }
                }
            });
        } catch (error: unknown) {
            if (error instanceof errors.ResponseError && error.statusCode === 404) { // TODO: should this be done?
            // if ((error as errors.ResponseError)?.statusCode === 404) {}
                throw new NoSuchAccountError();
            }
            throw new UnableToUpdateAccountError((error as any)?.message);
        }
    }
}
