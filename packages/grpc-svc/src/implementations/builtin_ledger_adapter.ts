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

import {ILedgerAdapter} from "../domain/infrastructure-types/ledger";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    BuiltinLedgerGrpcClient,
    GrpcAccount, GrpcAccount__Output,
    GrpcJournalEntry, GrpcJournalEntry__Output
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {LedgerAccount, LedgerJournalEntry} from "../domain/infrastructure-types/ledger";

export class BuiltinLedgerAdapter implements ILedgerAdapter {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    // Other properties.
    private readonly client: BuiltinLedgerGrpcClient;

    constructor(
        logger: ILogger,
        host: string,
        portNo: number,
        timeoutMs: number
    ) {
        this.logger = logger.createChild(this.constructor.name);

        this.client = new BuiltinLedgerGrpcClient(
            logger,
            host,
            portNo,
            timeoutMs
        );
    }

    async init(): Promise<void> {
        await this.client.init();
    }

    async destroy(): Promise<void> {
        await this.client.destroy();
    }

    async setCurrencies(currencies: {code: string, decimals: number}[]): Promise<void> {
        // This adapter does not convert currencies because the service does it. TODO: clarify.
        return;
    }

    async createAccounts(ledgerAccounts: LedgerAccount[]): Promise<string[]> {
        const grpcAccounts: GrpcAccount[] = ledgerAccounts.map((ledgerAccount) => {
            const grpcAccount: GrpcAccount = {
                id: ledgerAccount.id ?? undefined,
                state: ledgerAccount.state,
                type: ledgerAccount.type,
                currencyCode: ledgerAccount.currencyCode,
                debitBalance: ledgerAccount.debitBalance,
                creditBalance: ledgerAccount.creditBalance,
                balance: ledgerAccount.balance,
                timestampLastJournalEntry: ledgerAccount.timestampLastJournalEntry ?? undefined
            };
            return grpcAccount; // TODO: return object directly instead?
        });

        const accountIds: string[] = await this.client.createAccounts({grpcAccountArray: grpcAccounts});
        return accountIds;
    }

    async createJournalEntries(ledgerJournalEntries: LedgerJournalEntry[]): Promise<string[]> {
        const grpcJournalEntries: GrpcJournalEntry[] = ledgerJournalEntries.map((ledgerJournalEntry) => {
            const grpcJournalEntry: GrpcJournalEntry = {
                id: ledgerJournalEntry.id ?? undefined,
                currencyCode: ledgerJournalEntry.currencyCode,
                amount: ledgerJournalEntry.amount,
                debitedAccountId: ledgerJournalEntry.debitedAccountId,
                creditedAccountId: ledgerJournalEntry.creditedAccountId,
                timestamp: ledgerJournalEntry.timestamp ?? undefined
            };
            return grpcJournalEntry; // TODO: return object directly instead?
        });

        const journalEntryIds: string[] = await this.client.createJournalEntries(
            {grpcJournalEntryArray: grpcJournalEntries}
        );
        return journalEntryIds;
    }

    // TODO: why not return AccountDTO[] instead of LedgerAccount[]?
    async getAccountsByIds(accountIds: string[]): Promise<LedgerAccount[]> {
        const grpcAccountsOutput: GrpcAccount__Output[] = await this.client.getAccountsByIds(accountIds); // TODO: pass the strings directly?

        const ledgerAccounts: LedgerAccount[] = grpcAccountsOutput.map((grpcAccountOutput) => {
            if (
                !grpcAccountOutput.state
                || !grpcAccountOutput.type
                || !grpcAccountOutput.currencyCode
                || !grpcAccountOutput.balance
                || !grpcAccountOutput.debitBalance
                || !grpcAccountOutput.creditBalance
            ) {
                throw new Error(); // TODO: should this be done? should there be a message?
            }

            const ledgerAccount: LedgerAccount = {
                id: grpcAccountOutput.id ?? null,
                state: grpcAccountOutput.state,
                type: grpcAccountOutput.type,
                currencyCode: grpcAccountOutput.currencyCode,
                balance: grpcAccountOutput.balance,
                debitBalance: grpcAccountOutput.debitBalance,
                creditBalance: grpcAccountOutput.creditBalance,
                timestampLastJournalEntry: grpcAccountOutput.timestampLastJournalEntry ?? null
            };
            return ledgerAccount; // TODO: return object directly instead?
        });

        return ledgerAccounts;
    }

    // TODO: why not return JournalEntryDTO[] instead of LedgerJournalEntry[]?
    async getJournalEntriesByAccountId(accountId: string): Promise<LedgerJournalEntry[]> {
        const grpcJournalEntriesOutput: GrpcJournalEntry__Output[] =
            await this.client.getJournalEntriesByAccountId(accountId); // TODO: pass the string directly?

        const ledgerJournalEntries: LedgerJournalEntry[] =
            grpcJournalEntriesOutput.map((grpcJournalEntryOutput) => {
            if (
                !grpcJournalEntryOutput.currencyCode
                || !grpcJournalEntryOutput.amount
                || !grpcJournalEntryOutput.debitedAccountId
                || !grpcJournalEntryOutput.creditedAccountId
            ) {
                throw new Error(); // TODO: should this be done? should there be a message?
            }

            const ledgerJournalEntry: LedgerJournalEntry = {
                id: grpcJournalEntryOutput.id ?? null,
                currencyCode: grpcJournalEntryOutput.currencyCode,
                amount: grpcJournalEntryOutput.amount,
                debitedAccountId: grpcJournalEntryOutput.debitedAccountId,
                creditedAccountId: grpcJournalEntryOutput.creditedAccountId,
                timestamp: grpcJournalEntryOutput.timestamp ?? null
            };
            return ledgerJournalEntry; // TODO: return object directly instead?
        });

        return ledgerJournalEntries;
    }
}
