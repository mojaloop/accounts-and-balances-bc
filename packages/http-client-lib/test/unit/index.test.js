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
var accounts_and_balances_http_service_mock_1 = require("./accounts_and_balances_http_service_mock");
var src_1 = require("../../src");
var src_2 = require("../../src");
var accounts_and_balances_bc_public_types_lib_1 = require("@mojaloop/accounts-and-balances-bc-public-types-lib");
var BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE = "http://localhost:1234";
var TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT = 10000;
var accountsAndBalancesHttpServiceMock;
var accountsAndBalancesHttpClient;
describe("accounts and balances http client library - unit tests", function () {
    beforeAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        var logger;
        return __generator(this, function (_a) {
            logger = new logging_bc_public_types_lib_1.ConsoleLogger();
            accountsAndBalancesHttpServiceMock = new accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock(logger, BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE);
            accountsAndBalancesHttpClient = new src_1.AccountsAndBalancesHttpClient(logger, BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE, TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT, accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.VALID_ACCESS_TOKEN);
            return [2 /*return*/];
        });
    }); });
    // Create account.
    test("create non-existent account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, accountIdReceived;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    accountIdReceived = _a.sent();
                    expect(accountIdReceived).toEqual(accountId);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create existent account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToCreateAccountError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with unreachable server", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID;
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
                    accountsAndBalancesHttpServiceMock.disable();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToCreateAccountError)];
                case 1:
                    _a.sent();
                    accountsAndBalancesHttpServiceMock.enable();
                    return [2 /*return*/];
            }
        });
    }); });
    // Create journal entries.
    test("create non-existent journal entries", function () { return __awaiter(void 0, void 0, void 0, function () {
        var idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, idsJournalEntries;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    idJournalEntryA = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
                    journalEntryDtoA = {
                        id: idJournalEntryA,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: "a",
                        debitedAccountId: "b",
                        timestamp: 0
                    };
                    idJournalEntryB = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
                    journalEntryDtoB = {
                        id: idJournalEntryB,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: "b",
                        debitedAccountId: "a",
                        timestamp: 0
                    };
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 1:
                    idsJournalEntries = _a.sent();
                    expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create existent journal entries", function () { return __awaiter(void 0, void 0, void 0, function () {
        var idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    idJournalEntryA = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
                    journalEntryDtoA = {
                        id: idJournalEntryA,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: "a",
                        debitedAccountId: "b",
                        timestamp: 0
                    };
                    idJournalEntryB = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_JOURNAL_ENTRY_ID;
                    journalEntryDtoB = {
                        id: idJournalEntryB,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: "b",
                        debitedAccountId: "a",
                        timestamp: 0
                    };
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToCreateJournalEntriesError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with unreachable server", function () { return __awaiter(void 0, void 0, void 0, function () {
        var journalEntryId, journalEntry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    journalEntryId = accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_JOURNAL_ENTRY_ID;
                    journalEntry = {
                        id: journalEntryId,
                        externalId: null,
                        externalCategory: null,
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: "a",
                        debitedAccountId: "b",
                        timestamp: 0
                    };
                    accountsAndBalancesHttpServiceMock.disable();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntry])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToCreateJournalEntriesError)];
                case 1:
                    _a.sent();
                    accountsAndBalancesHttpServiceMock.enable();
                    return [2 /*return*/];
            }
        });
    }); });
    // Get account by id.
    test("get non-existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountById(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID)];
                case 1:
                    accountDto = _a.sent();
                    expect(accountDto).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountById(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID)];
                case 1:
                    accountDto = _a.sent();
                    expect(accountDto === null || accountDto === void 0 ? void 0 : accountDto.id).toEqual(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get account with unreachable server", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountsAndBalancesHttpServiceMock.disable();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountById(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToGetAccountError)];
                case 1:
                    _a.sent();
                    accountsAndBalancesHttpServiceMock.enable();
                    return [2 /*return*/];
            }
        });
    }); });
    test("get account with internal server error", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountById(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }).rejects.toThrow(src_2.UnableToGetAccountError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Get accounts by external id.
    test("get non-existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountsByExternalId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_EXTERNAL_ID)];
                case 1:
                    accountDtos = _a.sent();
                    expect(accountDtos).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountsByExternalId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_EXTERNAL_ID)];
                case 1:
                    accountDtos = _a.sent();
                    expect(accountDtos).toEqual([
                        { id: accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_A },
                        { id: accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_ACCOUNT_B }
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get accounts with unreachable server", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountsAndBalancesHttpServiceMock.disable();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountsByExternalId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_EXTERNAL_ID)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToGetAccountsError)];
                case 1:
                    _a.sent();
                    accountsAndBalancesHttpServiceMock.enable();
                    return [2 /*return*/];
            }
        });
    }); });
    test("get accounts with internal server error", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountsByExternalId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }).rejects.toThrow(src_2.UnableToGetAccountsError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Get journal entries by account id.
    test("get non-existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var journalEntryDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.NON_EXISTENT_ACCOUNT_ID)];
                case 1:
                    journalEntryDtos = _a.sent();
                    expect(journalEntryDtos).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var journalEntryDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID)];
                case 1:
                    journalEntryDtos = _a.sent();
                    expect(journalEntryDtos).toEqual([
                        { id: accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_A },
                        { id: accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_JOURNAL_ENTRY_B }
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get journal entries with unreachable server", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountsAndBalancesHttpServiceMock.disable();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.EXISTENT_ACCOUNT_ID)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(src_2.UnableToGetJournalEntriesError)];
                case 1:
                    _a.sent();
                    accountsAndBalancesHttpServiceMock.enable();
                    return [2 /*return*/];
            }
        });
    }); });
    test("get journal entries with internal server error", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accounts_and_balances_http_service_mock_1.AccountsAndBalancesHttpServiceMock.ID_INTERNAL_SERVER_ERROR)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }).rejects.toThrow(src_2.UnableToGetJournalEntriesError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
