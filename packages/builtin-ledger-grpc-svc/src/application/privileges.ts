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


import {BuiltinLedgerPrivileges} from "../domain/privilege_names";

export const BuiltinLedgerPrivilegesDefinition = [
    {
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_ACCOUNT,
        labelName: "Create Builtin Ledger Accounts",
        description: "Allows for the creation of accounts in the Builtin Ledger"
    }, {
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_CREATE_JOURNAL_ENTRY,
        labelName: "Create Builtin Ledger Journal Entries",
        description: "Allows for the creation of journal entries in the Builtin Ledger"
    }, {
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_ACCOUNT,
        labelName: "View Builtin Ledger Accounts",
        description: "Allows for the retrieval of accounts from the Builtin Ledger"
    }, {
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_VIEW_JOURNAL_ENTRY,
        labelName: "View Builtin Ledger Journal Entries",
        description: "Allows for the retrieval of journal entries from the Builtin Ledger"
    },{
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_DEACTIVATE_ACCOUNT,
        labelName: "Deactivate Builtin Ledger Accounts",
        description: "Mark account as inactive (no entries can be recorded) in the Builtin Ledger"
    }, {
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_REACTIVATE_ACCOUNT,
        labelName: "Reactivate Builtin Ledger Accounts",
        description: "Mark an inactive as active in the Builtin Ledger\""
    },{
        privId: BuiltinLedgerPrivileges.BUILTIN_LEDGER_DELETE_ACCOUNT,
        labelName: "Mark Builtin Ledger Account as deleted",
        description: "Mark an inactive account as deleted (entries can be archived) in the Builtin Ledger\""
    }

];

