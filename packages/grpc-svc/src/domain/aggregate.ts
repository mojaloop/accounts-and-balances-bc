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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IChartOfAccountsRepo} from "./chart_of_accounts_repo_interface";
import {ILedgerAdapter} from "./ledger_adapter_interfaces";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class AccountsAndBalancesAggregate{
    private _logger:ILogger;
    private _repo:IChartOfAccountsRepo;
    private _ledgerAdapter:ILedgerAdapter;

    constructor(repo:IChartOfAccountsRepo, ledgerAdapter:ILedgerAdapter, logger:ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._repo = repo;
        this._ledgerAdapter = ledgerAdapter
    }

    createAccounts(accountDtos:IAccountDto[]):Promise<string[]>{
        // TODO apply privileges

        /* TODO
            1. verify inputs (accountDtos)
            2. get repo.accountById to make sure we don't have duplicates
            3. call ledgerAdapter.createAccount() and get the ledgerAccountIds of the created accounts
            4. if ok -> store the new account maps on the CoA.repo
            5. return to caller with the ids of the CoA, not the external ledgerAccountIds
         */
    }

    getAccounts(accountIds:string[]):Promise<IAccountDto[]>{
        // TODO apply privileges

        /* TODO
        1. get account from CoA.repo
        2. if found, get ledger account from ledgerAdapter using the ledgerAccountID
        */

    }

    createEntries(entryDtos:IJournalEntryDto[]):Promise<string[]>{
        // TODO apply privileges

        /* TODO
        1. make sure the accounts exist in the CoA.repo, its' states are ok and the currencies match
        2. if ok, call the ledger adapter to create the entries, using the ledgerAccountIDs
        3. return to caller with the ids of the CoA, not the external ledgerAccountIds
        */
    }

    getEntries(entryIds:string[]):Promise<IJournalEntryDto[]>{
        // TODO apply privileges

        // same logic as the getAccounts
    }
}
