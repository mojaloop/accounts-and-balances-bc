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
exports.AuxiliaryAccountsAndBalancesGrpcClient = void 0;
var grpc_js_1 = require("@grpc/grpc-js");
var accounts_and_balances_bc_grpc_common_lib_1 = require("@mojaloop/accounts-and-balances-bc-grpc-common-lib");
var AuxiliaryAccountsAndBalancesGrpcClient = /** @class */ (function () {
    function AuxiliaryAccountsAndBalancesGrpcClient(logger, host, portNo) {
        this.logger = logger;
        var packageDefinition = (0, accounts_and_balances_bc_grpc_common_lib_1.loadProto)();
        var grpcObject = (0, grpc_js_1.loadPackageDefinition)(packageDefinition);
        this.grpcClient = new grpcObject.AccountsAndBalancesGrpcService("".concat(host, ":").concat(portNo), grpc_js_1.credentials.createInsecure());
    }
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.grpcClient.waitForReady(Date.now() + 50000, // TODO: put this value in a constant.
                        function (error) {
                            if (error) {
                                reject(error);
                            }
                            _this.logger.info("gRPC client initialized 🚀");
                            resolve();
                        });
                    })];
            });
        });
    };
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.grpcClient.close();
                this.logger.info("gRPC client destroyed 🏁");
                return [2 /*return*/];
            });
        });
    };
    // TODO: verify types.
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.createAccount = function (accountDto) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var grpcAccount = (0, accounts_and_balances_bc_grpc_common_lib_1.accountDtoToGrpcAccount)(accountDto);
                        _this.grpcClient.createAccount(grpcAccount, function (error, grpcId) {
                            if (error) {
                                reject(error);
                                return; // TODO: return?
                            }
                            var accountId = grpcId.grpcId; // TODO: !.
                            resolve(accountId);
                        });
                    })];
            });
        });
    };
    // TODO: verify types.
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.createJournalEntries = function (journalEntryDtos) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var grpcJournalEntries = journalEntryDtos.map(function (journalEntryDto) {
                            return (0, accounts_and_balances_bc_grpc_common_lib_1.journalEntryDtoToGrpcJournalEntry)(journalEntryDto);
                        });
                        var grpcJournalEntryArray = { grpcJournalEntryArray: grpcJournalEntries };
                        _this.grpcClient.createJournalEntries(grpcJournalEntryArray, function (error, grpcIdArray) {
                            if (error) {
                                reject(error);
                                return; // TODO: return?
                            }
                            var idsJournalEntries = grpcIdArray.grpcIdArray.map(function (grpcId) {
                                return grpcId.grpcId;
                            });
                            resolve(idsJournalEntries);
                        });
                    })];
            });
        });
    };
    // TODO: verify types.
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.getAccountById = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var grpcAccountId = { grpcId: accountId };
                        _this.grpcClient.getAccountById(grpcAccountId, function (error, grpcAccount) {
                            if (error) {
                                reject(error);
                                return; // TODO: return?
                            }
                            var accountDto;
                            if (grpcAccount.id === "") { // TODO: !.
                                accountDto = null;
                            }
                            else {
                                accountDto = (0, accounts_and_balances_bc_grpc_common_lib_1.grpcAccountToAccountDto)(grpcAccount); // TODO: !.
                            }
                            resolve(accountDto);
                        });
                    })];
            });
        });
    };
    // TODO: verify types.
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.getAccountsByExternalId = function (externalId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var grpcExternalId = { grpcId: externalId };
                        _this.grpcClient.getAccountsByExternalId(grpcExternalId, function (error, grpcAccountArray) {
                            if (error) {
                                reject(error);
                                return; // TODO: return?
                            }
                            var accountDtos = grpcAccountArray.grpcAccountArray.map(function (grpcAccount) {
                                return (0, accounts_and_balances_bc_grpc_common_lib_1.grpcAccountToAccountDto)(grpcAccount);
                            });
                            resolve(accountDtos);
                        });
                    })];
            });
        });
    };
    // TODO: verify types.
    AuxiliaryAccountsAndBalancesGrpcClient.prototype.getJournalEntriesByAccountId = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var grpcAccountId = { grpcId: accountId };
                        _this.grpcClient.getJournalEntriesByAccountId(grpcAccountId, function (error, grpcJournalEntryArray) {
                            if (error) {
                                reject(error);
                                return; // TODO: return?
                            }
                            var journalEntryDtos = grpcJournalEntryArray.grpcJournalEntryArray.map(function (grpcJournalEntry) {
                                return (0, accounts_and_balances_bc_grpc_common_lib_1.grpcJournalEntryToJournalEntryDto)(grpcJournalEntry);
                            });
                            resolve(journalEntryDtos);
                        });
                    })];
            });
        });
    };
    return AuxiliaryAccountsAndBalancesGrpcClient;
}());
exports.AuxiliaryAccountsAndBalancesGrpcClient = AuxiliaryAccountsAndBalancesGrpcClient;
