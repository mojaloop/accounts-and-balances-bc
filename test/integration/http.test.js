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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
var logging_bc_public_types_lib_1 = require("@mojaloop/logging-bc-public-types-lib");
var accounts_and_balances_bc_http_client_lib_1 = require("@mojaloop/accounts-and-balances-bc-http-client-lib");
var logging_bc_client_lib_1 = require("@mojaloop/logging-bc-client-lib");
var Crypto = require("crypto");
var accounts_and_balances_bc_public_types_lib_1 = require("@mojaloop/accounts-and-balances-bc-public-types-lib");
/* ********** Constants Begin ********** */
// General.
var BOUNDED_CONTEXT_NAME = "accounts-and-balances-bc";
var SERVICE_NAME = "integration-tests-http";
var SERVICE_VERSION = "0.0.1";
// Message broker.
var MESSAGE_BROKER_HOST = (_a = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST) !== null && _a !== void 0 ? _a : "localhost";
var MESSAGE_BROKER_PORT_NO = parseInt((_b = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO) !== null && _b !== void 0 ? _b : "") || 9092;
var MESSAGE_BROKER_URL = "".concat(MESSAGE_BROKER_HOST, ":").concat(MESSAGE_BROKER_PORT_NO);
// Logging.
var LOGGING_LEVEL = logging_bc_public_types_lib_1.LogLevel.INFO;
var LOGGING_TOPIC = "logs";
// Accounts and Balances HTTP client.
var BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE = "http://localhost:1234";
var TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT = 10000;
var ACCESS_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNSMHVoT2hpM05VbmJlMTF5SDZtOUZtcFpNN2JiRVl2czdpbGNfanN1MHMifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbXSwiaWF0IjoxNjYyMjE5NzQ5LCJleHAiOjQ4MTc5MTQ5NDksImF1ZCI6Im1vamFsb29wLnZuZXh0LmRlZmF1bHRfYXVkaWVuY2UiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjMyMDEvIiwic3ViIjoidXNlcjo6dXNlciIsImp0aSI6ImJjYzk3OWRlLTdkNzItNGUyNC04YjIyLWM5NjlmMDAwYTg0YSJ9.py8iSYZp0KtZ1os7vXoH8oOAZFQCJyj3gWNW3EQTGl-cS8U6ErJpEv0nGrNfPGIdwNgSBe0esjlLKU7hCA-p71AnToCxA3zDqMaB6Pm7FH376AP71VTTGNa2rcWMrQivPEFzlxpvlIV-KWVrJUE2j0-SVPjlSphBnqBHybID_y3I1Ix5eoKsotZrBNeVzYqRcN7lUnbdxb7Oi5-ss5bmmo__iAB4EaW8LfdgiIL3AsYrxWoRdsBNOa1v7AJ6v7z7HcWzdJ1hF_DgG7wX2sVRHZcCnT55bL-zb614csaUbEeOpOmQ5STsR9rdSFPfN2vzpD9OX6b2uHj4digHQtuCDA";
/* ********** Constants End ********** */
var logger;
var accountsAndBalancesHttpClient;
describe("accounts and balances - integration tests with HTTP service", function () {
    beforeAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        var kafkaProducerOptions;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    kafkaProducerOptions = {
                        kafkaBrokerList: MESSAGE_BROKER_URL
                    };
                    logger = new logging_bc_client_lib_1.KafkaLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION, kafkaProducerOptions, LOGGING_TOPIC, LOGGING_LEVEL);
                    return [4 /*yield*/, logger.init()];
                case 1:
                    _a.sent();
                    accountsAndBalancesHttpClient = new accounts_and_balances_bc_http_client_lib_1.AccountsAndBalancesHttpClient(logger, BASE_URL_ACCOUNTS_AND_BALANCES_HTTP_SERVICE, TIMEOUT_MS_ACCOUNTS_AND_BALANCES_HTTP_CLIENT, ACCESS_TOKEN);
                    return [2 /*return*/];
            }
        });
    }); });
    afterAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, logger.destroy()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Create account.
    test("create non-existent account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, accountIdReceived;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateAccountError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with empty string as id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, accountIdReceived;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    accountIdReceived = _a.sent();
                    expect(accountIdReceived).not.toEqual(accountId); // TODO: makes sense?
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with invalid credit balance", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateAccountError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create account with invalid debit balance", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateAccountError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // TODO: verify.
    /*test("create account with unreachable server", async () => {
        const accountId: string = Crypto.randomUUID();
        const accountDto: IAccountDto = {
            id: accountId,
            externalId: null,
            state: AccountState.ACTIVE,
            type: AccountType.POSITION,
            currency: "EUR",
            creditBalance: "100",
            debitBalance: "25",
            timestampLastJournalEntry: 0
        };
        // disable();
        await expect(
            async () => {
                await accountsAndBalancesHttpClient.createAccount(accountDto);
            }
        ).rejects.toThrow(UnableToCreateAccountError);
        // enable();
    });*/
    // Create journal entries.
    test("create non-existent journal entries", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, idsJournalEntries;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    idsJournalEntries = _a.sent();
                    expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create existent journal entries", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with empty string as id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto, journalEntryIdReceived;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                case 2:
                    journalEntryIdReceived = _a.sent();
                    expect(journalEntryIdReceived).not.toEqual(journalEntryId); // TODO: makes sense?
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with same credited and debited accounts", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with non-existent credited account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with non-existent debited account", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with different currency", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with exceeding amount", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("create journal entry with invalid amount", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, journalEntryId, journalEntryDto;
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
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto])];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(accounts_and_balances_bc_http_client_lib_1.UnableToCreateJournalEntriesError)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // TODO: verify.
    /*test("create journal entry with unreachable server", async () => {
        const journalEntryId: string = Crypto.randomUUID();
        const journalEntryDto: IJournalEntryDto = {
            id: journalEntryId,
            externalId: null,
            externalCategory: null,
            currency: "EUR",
            amount: "5",
            creditedAccountId: "a",
            debitedAccountId: "b",
            timestamp: 0
        };
        // disable();
        await expect(
            async () => {
                await accountsAndBalancesHttpClient.createJournalEntries([journalEntryDto]);
            }
        ).rejects.toThrow(UnableToCreateJournalEntriesError);
        // enable();
    });*/
    // Get account by id.
    test("get non-existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountById(accountId)];
                case 1:
                    accountDto = _a.sent();
                    expect(accountDto).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto, accountDtoReceived;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDto)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountById(accountId)];
                case 2:
                    accountDtoReceived = _a.sent();
                    expect(accountDtoReceived).toEqual(accountDto);
                    return [2 /*return*/];
            }
        });
    }); });
    // Get accounts by external id.
    test("get non-existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalId, accountDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    externalId = Crypto.randomUUID();
                    return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountsByExternalId(externalId)];
                case 1:
                    accountDtos = _a.sent();
                    expect(accountDtos).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalId, accountDtos, accountDtosReceived;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    externalId = Crypto.randomUUID();
                    return [4 /*yield*/, create2Accounts(externalId, externalId)];
                case 1:
                    accountDtos = _a.sent();
                    return [4 /*yield*/, accountsAndBalancesHttpClient.getAccountsByExternalId(externalId)];
                case 2:
                    accountDtosReceived = _a.sent();
                    expect(accountDtosReceived).toEqual(accountDtos);
                    return [2 /*return*/];
            }
        });
    }); });
    // Get journal entries by account id.
    test("get non-existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, journalEntryDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    return [4 /*yield*/, accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountId)];
                case 1:
                    journalEntryDtos = _a.sent();
                    expect(journalEntryDtos).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, journalEntryDtosReceived;
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, accountsAndBalancesHttpClient.getJournalEntriesByAccountId(accountDtos[0].id)];
                case 3:
                    journalEntryDtosReceived = _a.sent();
                    expect(journalEntryDtosReceived).toEqual([journalEntryDtoA, journalEntryDtoB]);
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDtoA)];
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
                    return [4 /*yield*/, accountsAndBalancesHttpClient.createAccount(accountDtoB)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, [accountDtoA, accountDtoB]];
            }
        });
    });
}
