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
exports.RpcHandlers = void 0;
var accounts_and_balances_bc_grpc_common_lib_1 = require("@mojaloop/accounts-and-balances-bc-grpc-common-lib");
var RpcHandlers = /** @class */ (function () {
    function RpcHandlers(logger, aggregate) {
        // Other properties.
        this.securityContext = {
            username: "",
            clientId: "",
            rolesIds: [""],
            accessToken: ""
        };
        this.logger = logger;
        this.aggregate = aggregate;
    }
    RpcHandlers.prototype.getHandlers = function () {
        return {
            "CreateAccount": this.createAccount.bind(this),
            "CreateJournalEntries": this.createJournalEntries.bind(this),
            "GetAccountById": this.getAccountById.bind(this),
            "GetAccountsByExternalId": this.getAccountsByExternalId.bind(this),
            "GetJournalEntriesByAccountId": this.getJournalEntriesByAccountId.bind(this)
        };
    };
    // TODO: error handling; verify types.
    RpcHandlers.prototype.createAccount = function (call, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var accountDto, accountId, grpcAccountId, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        accountDto = (0, accounts_and_balances_bc_grpc_common_lib_1.grpcAccountToAccountDto)(call.request);
                        return [4 /*yield*/, this.aggregate.createAccount(accountDto, this.securityContext)];
                    case 1:
                        accountId = _a.sent();
                        grpcAccountId = { grpcId: accountId };
                        callback(null, grpcAccountId);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        if (error_1 instanceof Error) {
                            callback(error_1, null);
                            return [2 /*return*/];
                        }
                        this.logger.error(error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RpcHandlers.prototype.createJournalEntries = function (call, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var journalEntryDtos, idsJournalEntries, grpcIdsJournalEntries, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        journalEntryDtos = call.request.grpcJournalEntryArray.map(function (grpcJournalEntry) {
                            return (0, accounts_and_balances_bc_grpc_common_lib_1.grpcJournalEntryToJournalEntryDto)(grpcJournalEntry);
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.aggregate.createJournalEntries(journalEntryDtos, this.securityContext)];
                    case 2:
                        idsJournalEntries = _a.sent();
                        grpcIdsJournalEntries = idsJournalEntries.map(function (id) {
                            return { grpcId: id };
                        });
                        callback(null, { grpcIdArray: grpcIdsJournalEntries });
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        if (error_2 instanceof Error) {
                            callback(error_2, null);
                            return [2 /*return*/];
                        }
                        this.logger.error(error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    RpcHandlers.prototype.getAccountById = function (call, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var accountId, accountDto, grpcAccount, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        accountId = call.request.grpcId;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.aggregate.getAccountById(accountId, this.securityContext)];
                    case 2:
                        accountDto = _a.sent();
                        if (accountDto === null) {
                            callback(null, {}); // Default gRPC account is sent (fields with default values).
                            return [2 /*return*/];
                        }
                        grpcAccount = (0, accounts_and_balances_bc_grpc_common_lib_1.accountDtoToGrpcAccount)(accountDto);
                        callback(null, grpcAccount);
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        if (error_3 instanceof Error) {
                            callback(error_3, null);
                            return [2 /*return*/];
                        }
                        this.logger.error(error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    RpcHandlers.prototype.getAccountsByExternalId = function (call, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var externalId, accountDtos, grpcAccounts, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        externalId = call.request.grpcId;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.aggregate.getAccountsByExternalId(externalId, this.securityContext)];
                    case 2:
                        accountDtos = _a.sent();
                        grpcAccounts = accountDtos.map(function (accountDto) {
                            return (0, accounts_and_balances_bc_grpc_common_lib_1.accountDtoToGrpcAccount)(accountDto);
                        });
                        callback(null, { grpcAccountArray: grpcAccounts });
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        if (error_4 instanceof Error) {
                            callback(error_4, null);
                            return [2 /*return*/];
                        }
                        this.logger.error(error_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    RpcHandlers.prototype.getJournalEntriesByAccountId = function (call, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var accountId, journalEntryDtos, grpcJournalEntries, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        accountId = call.request.grpcId;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.aggregate.getJournalEntriesByAccountId(accountId, this.securityContext)];
                    case 2:
                        journalEntryDtos = _a.sent();
                        grpcJournalEntries = journalEntryDtos.map(function (journalEntryDto) {
                            return (0, accounts_and_balances_bc_grpc_common_lib_1.journalEntryDtoToGrpcJournalEntry)(journalEntryDto);
                        });
                        callback(null, { grpcJournalEntryArray: grpcJournalEntries });
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        if (error_5 instanceof Error) {
                            callback(error_5, null);
                            return [2 /*return*/];
                        }
                        this.logger.error(error_5);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return RpcHandlers;
}());
exports.RpcHandlers = RpcHandlers;
