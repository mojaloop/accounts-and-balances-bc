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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsAndBalancesHttpServiceMock = void 0;
var nock_1 = require("nock");
var AccountsAndBalancesHttpServiceMock = /** @class */ (function () {
    function AccountsAndBalancesHttpServiceMock(logger, baseUrl) {
        this.logger = logger;
        this.BASE_URL = baseUrl;
        this.setUp();
    }
    AccountsAndBalancesHttpServiceMock.prototype.setUp = function () {
        // Create account.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .post("/accounts")
            .reply(function (_, requestBody) {
            if (requestBody.id === AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID) {
                return [
                    409,
                    { message: "account already exists" }
                ];
            }
            return [
                201,
                { accountId: requestBody.id }
            ];
        });
        // Create journal entries.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .post("/journalEntries")
            .reply(function (_, requestBody) {
            var idsJournalEntries = [];
            for (var _i = 0, requestBody_1 = requestBody; _i < requestBody_1.length; _i++) {
                var journalEntry = requestBody_1[_i];
                if (journalEntry.id === AccountsAndBalancesHttpServiceMock.EXISTENT_JOURNAL_ENTRY_ID) {
                    return [
                        409,
                        { message: "journal entry already exists" }
                    ];
                }
                idsJournalEntries.push(journalEntry.id);
            }
            return [
                201,
                { idsJournalEntries: idsJournalEntries }
            ];
        });
        // Get non-existent account by id.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/accounts")
            .query({ id: AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID })
            .reply(404, { message: "no such account" });
        // Get existent account by id.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/accounts")
            .query({ id: AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID })
            .reply(200, { account: { id: AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID } });
        // Get account with internal server error.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/accounts")
            .query({ id: AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR })
            .reply(500, { message: "unknown error" });
        // Get non-existent accounts by external id.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/accounts")
            .query({ externalId: AccountsAndBalancesHttpServiceMock.NON_EXISTENT_EXTERNAL_ID })
            .reply(404, { message: "no accounts with the specified external id" });
        // Get existent accounts by external id.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/accounts")
            .query({ externalId: AccountsAndBalancesHttpServiceMock.EXISTENT_EXTERNAL_ID })
            .reply(200, {
            accounts: [
                { id: AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_A },
                { id: AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_B }
            ]
        });
        // Get accounts with internal server error.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/accounts")
            .query({ externalId: AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR })
            .reply(500, { message: "unknown error" });
        // Get non-existent journal entries by account id.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/journalEntries")
            .query({ accountId: AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID })
            .reply(404, { message: "no journal entries with the specified account id" });
        // Get existent journal entries by account id.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/journalEntries")
            .query({ accountId: AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID })
            .reply(200, {
            journalEntries: [
                { id: AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_A },
                { id: AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_B }
            ]
        });
        // Get journal entries with internal server error.
        (0, nock_1.default)(this.BASE_URL)
            .persist()
            .get("/journalEntries")
            .query({ accountId: AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR })
            .reply(500, { message: "unknown error" });
    };
    AccountsAndBalancesHttpServiceMock.prototype.disable = function () {
        nock_1.default.restore();
    };
    AccountsAndBalancesHttpServiceMock.prototype.enable = function () {
        nock_1.default.activate();
    };
    // Other properties.
    AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID = "a";
    AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID = "b";
    AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID = "c";
    AccountsAndBalancesHttpServiceMock.EXISTENT_JOURNAL_ENTRY_ID = "d";
    AccountsAndBalancesHttpServiceMock.NON_EXISTENT_EXTERNAL_ID = "e";
    AccountsAndBalancesHttpServiceMock.EXISTENT_EXTERNAL_ID = "f";
    AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR = "g";
    AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_A = "account_a";
    AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_B = "account_b";
    AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_A = "journal_entry_a";
    AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_B = "journal_entry_b";
    AccountsAndBalancesHttpServiceMock.VALID_ACCESS_TOKEN = "";
    return AccountsAndBalancesHttpServiceMock;
}());
exports.AccountsAndBalancesHttpServiceMock = AccountsAndBalancesHttpServiceMock;
