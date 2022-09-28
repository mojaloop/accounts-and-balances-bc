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
var logging_bc_client_lib_1 = require("@mojaloop/logging-bc-client-lib");
var Crypto = require("crypto");
var accounts_and_balances_bc_grpc_client_lib_1 = require("@mojaloop/accounts-and-balances-bc-grpc-client-lib");
var accounts_and_balances_bc_public_types_lib_1 = require("@mojaloop/accounts-and-balances-bc-public-types-lib");
/* ********** Constants Begin ********** */
// General.
var BOUNDED_CONTEXT_NAME = "accounts-and-balances-bc";
var SERVICE_NAME = "integration-tests-grpc";
var SERVICE_VERSION = "0.0.1";
// Message broker.
var MESSAGE_BROKER_HOST = (_a = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST) !== null && _a !== void 0 ? _a : "localhost";
var MESSAGE_BROKER_PORT_NO = parseInt((_b = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO) !== null && _b !== void 0 ? _b : "") || 9092;
var MESSAGE_BROKER_URL = "".concat(MESSAGE_BROKER_HOST, ":").concat(MESSAGE_BROKER_PORT_NO);
// Logging.
var LOGGING_LEVEL = logging_bc_public_types_lib_1.LogLevel.INFO;
var LOGGING_TOPIC = "logs";
// Accounts and Balances gRPC client.
var ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST = "localhost"; // TODO: change name.
var ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO = 1234; // TODO: change name.
/* ********** Constants End ********** */
var logger;
var accountsAndBalancesGrpcClient;
describe("accounts and balances - integration tests with gRPC service", function () {
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
                    accountsAndBalancesGrpcClient = new accounts_and_balances_bc_grpc_client_lib_1.AccountsAndBalancesGrpcClient(logger, ACCOUNTS_AND_BALANCES_GRPC_SERVICE_HOST, ACCOUNTS_AND_BALANCES_GRPC_SERVICE_PORT_NO);
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.init()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    afterAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accountsAndBalancesGrpcClient.destroy()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, logger.destroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
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
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.createAccount(accountDto)];
                case 1:
                    accountIdReceived = _a.sent();
                    expect(accountIdReceived).toEqual(accountId);
                    return [2 /*return*/];
            }
        });
    }); });
    test("create non-existent journal entry", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountDtos, idJournalEntryA, journalEntryDtoA, idJournalEntryB, journalEntryDtoB, idsJournalEntries;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, create2Accounts()];
                case 1:
                    accountDtos = _a.sent();
                    idJournalEntryA = Crypto.randomUUID();
                    journalEntryDtoA = {
                        id: idJournalEntryA,
                        externalId: "",
                        externalCategory: "",
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[0].id,
                        debitedAccountId: accountDtos[1].id,
                        timestamp: 0
                    };
                    idJournalEntryB = idJournalEntryA + 1;
                    journalEntryDtoB = {
                        id: idJournalEntryB,
                        externalId: "",
                        externalCategory: "",
                        currency: "EUR",
                        amount: "5",
                        creditedAccountId: accountDtos[1].id,
                        debitedAccountId: accountDtos[0].id,
                        timestamp: 0
                    };
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.createJournalEntries([journalEntryDtoA, journalEntryDtoB])];
                case 2:
                    idsJournalEntries = _a.sent();
                    expect(idsJournalEntries).toEqual([idJournalEntryA, idJournalEntryB]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get non-existent account by id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, accountDto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.getAccountById(accountId)];
                case 1:
                    accountDto = _a.sent();
                    expect(accountDto).toEqual(null);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get non-existent accounts by external id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalId, accountDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    externalId = Crypto.randomUUID();
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.getAccountsByExternalId(externalId)];
                case 1:
                    accountDtos = _a.sent();
                    expect(accountDtos).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    test("get non-existent journal entries by account id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var accountId, journalEntryDtos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountId = Crypto.randomUUID();
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.getJournalEntriesByAccountId(accountId)];
                case 1:
                    journalEntryDtos = _a.sent();
                    expect(journalEntryDtos).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
});
function create2Accounts(externalIdAccountA, externalIdAccountB) {
    if (externalIdAccountA === void 0) { externalIdAccountA = ""; }
    if (externalIdAccountB === void 0) { externalIdAccountB = ""; }
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
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.createAccount(accountDtoA)];
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
                    return [4 /*yield*/, accountsAndBalancesGrpcClient.createAccount(accountDtoB)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, [accountDtoA, accountDtoB]];
            }
        });
    });
}
