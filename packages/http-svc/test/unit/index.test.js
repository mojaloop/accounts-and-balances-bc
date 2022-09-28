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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var logging_bc_public_types_lib_1 = require("@mojaloop/logging-bc-public-types-lib");
var auxiliary_accounts_and_balances_http_client_1 = require("./auxiliary_accounts_and_balances_http_client");
var Crypto = require("crypto");
var accounts_and_balances_bc_shared_mocks_lib_1 = require("@mojaloop/accounts-and-balances-bc-shared-mocks-lib");
var service_1 = require("../../src/service");
var accounts_and_balances_bc_public_types_lib_1 = require("@mojaloop/accounts-and-balances-bc-public-types-lib");
var BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE = "http://localhost:1234";
var TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT = 10000;
var authorizationClient;
var accountsRepo;
var journalEntriesRepo;
var auxiliaryAccountsAndBalancesHttpClient;
describe("accounts and balances http service - unit tests", function () {
    beforeAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        var logger, authenticationServiceMock, auditingClient;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger = new logging_bc_public_types_lib_1.ConsoleLogger();
                    authenticationServiceMock = new accounts_and_balances_bc_shared_mocks_lib_1.AuthenticationServiceMock(logger);
                    authorizationClient = new accounts_and_balances_bc_shared_mocks_lib_1.AuthorizationClientMock(logger);
                    auditingClient = new accounts_and_balances_bc_shared_mocks_lib_1.AuditClientMock(logger);
                    accountsRepo = new accounts_and_balances_bc_shared_mocks_lib_1.MemoryAccountsRepo(logger);
                    journalEntriesRepo = new accounts_and_balances_bc_shared_mocks_lib_1.MemoryJournalEntriesRepo(logger);
                    return [4 /*yield*/, (0, service_1.start)(logger, authorizationClient, auditingClient, accountsRepo, journalEntriesRepo)];
                case 1:
                    _a.sent();
                    auxiliaryAccountsAndBalancesHttpClient = new auxiliary_accounts_and_balances_http_client_1.AuxiliaryAccountsAndBalancesHttpClient(logger, BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE, TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT, accounts_and_balances_bc_shared_mocks_lib_1.AuthenticationServiceMock.VALID_ACCESS_TOKEN);
                    return [2 /*return*/];
            }
        });
    }); });
    afterAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, service_1.stop)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Create account.
    test("create non-existent account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(201);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create existent account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(409);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with empty string as id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = "";
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(201);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with invalid credit balance", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "-100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with invalid debit balance", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "-25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with unexpected accounts repo failure", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    accountsRepo.setUnexpectedFailure(true); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(500);
                    accountsRepo.setUnexpectedFailure(false); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with invalid access token", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    auxiliaryAccountsAndBalancesHttpClient.setAccessToken("");
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(403);
                    auxiliaryAccountsAndBalancesHttpClient.setAccessToken(accounts_and_balances_bc_shared_mocks_lib_1.AuthenticationServiceMock.VALID_ACCESS_TOKEN);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account without privileges", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    authorizationClient.setRoleHasPrivilege(false); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(403);
                    authorizationClient.setRoleHasPrivilege(true); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    // Create journal entries.
    test("create non-existent journal entries", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    idJournalEntryA = Crypto.randomUUID();
                    journalEntryDtoA = {
                        id: idJournalEntryA,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    idJournalEntryB = idJournalEntryA + 1;
                    journalEntryDtoB = {
                        id: idJournalEntryB,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[1].id,
                        debitedAccountId: accountDtos[0].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(201);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create existent journal entries", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    idJournalEntryA = Crypto.randomUUID();
                    journalEntryDtoA = {
                        id: idJournalEntryA,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    idJournalEntryB = idJournalEntryA + 1;
                    journalEntryDtoB = {
                        id: idJournalEntryB,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[1].id,
                        debitedAccountId: accountDtos[0].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient
                            .createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 3:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(409);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with empty string as id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = "";
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(201);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with same credited and debited accounts", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[0].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with non-existent credited account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: "some string",
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with non-existent debited account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: "some string",
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with different currency", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "USD",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with exceeding amount", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "10000",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with invalid amount", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "-5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(400);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with unexpected journal entries repo failure", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    journalEntriesRepo.setUnexpectedFailure(true); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(500);
                    journalEntriesRepo.setUnexpectedFailure(false); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with unexpected accounts repo failure", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    accountsRepo.setUnexpectedFailure(true); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(500);
                    accountsRepo.setUnexpectedFailure(false); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry without privileges", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    journalEntryId = Crypto.randomUUID();
                    journalEntryDto = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    authorizationClient.setRoleHasPrivilege(false); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(403);
                    authorizationClient.setRoleHasPrivilege(true); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    // Get account by id.
    test("get non-existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getAccountById(accountId)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(404);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    accountDto = {
                        id: accountId,
                        externalId: null,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getAccountById(accountId)];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(200);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get account by id without privileges", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    authorizationClient.setRoleHasPrivilege(false); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getAccountById(accountId)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(403);
                    authorizationClient.setRoleHasPrivilege(true); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    // Get accounts by external id.
    test("get non-existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    externalId = Crypto.randomUUID();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getAccountsByExternalId(externalId)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(404);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    externalId = Crypto.randomUUID();
                    return [4 /*yield*/, create2Accounts(externalId, externalId)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getAccountsByExternalId(externalId)];
                case 2:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(200);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get accounts by external id without privileges", function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    externalId = Crypto.randomUUID();
                    authorizationClient.setRoleHasPrivilege(false); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getAccountsByExternalId(externalId)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(403);
                    authorizationClient.setRoleHasPrivilege(true); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
    // Get journal entries by account id.
    test("get non-existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(404);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    idJournalEntryA = Crypto.randomUUID();
                    journalEntryDtoA = {
                        id: idJournalEntryA,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    idJournalEntryB = idJournalEntryA + 1;
                    journalEntryDtoB = {
                        id: idJournalEntryB,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[1].id,
                        debitedAccountId: accountDtos[0].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient
                            .createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountDtos[0].id)];
                case 3:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(200);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get journal entries by account id without privileges", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, statusCodeResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    authorizationClient.setRoleHasPrivilege(false); // TODO: should this be done?
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId)];
                case 1:
                    statusCodeResponse = _a.sent();
                    expect(statusCodeResponse).toEqual(403);
                    authorizationClient.setRoleHasPrivilege(true); // TODO: should this be done?
                    return [2 /*return*/];
            }
        });
    }); });
});
function create2Accounts(externalIdAccountA, externalIdAccountB) {
    if (externalIdAccountA === void 0) { externalIdAccountA = null; }
    if (externalIdAccountB === void 0) { externalIdAccountB = null; }
    return __awaiter(this, void 0, void 0, function () {
        var idAccountA, accountDtoA, idAccountB, accountDtoB;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    idAccountA = Crypto.randomUUID();
                    accountDtoA = {
                        id: idAccountA,
                        externalId: externalIdAccountA,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDtoA)];
                case 1:
                    _a.sent();
                    idAccountB = idAccountA + 1;
                    accountDtoB = {
                        id: idAccountB,
                        externalId: externalIdAccountB,
                        state: accounts_and_balances_bc_public_types_lib_1.AccountState.ACTIVE,
                        type: accounts_and_balances_bc_public_types_lib_1.AccountType.POSITION,
                        currency: "EUR",
                        creditBalance: "100",
                        debitBalance: "25",
                        timestampLastJournalEntry: 0
                    };
                    return [4 /*yield*/, auxiliaryAccountsAndBalancesHttpClient.createAccount(accountDtoB)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, [accountDtoA, accountDtoB]];
            }
        });
    });
}
