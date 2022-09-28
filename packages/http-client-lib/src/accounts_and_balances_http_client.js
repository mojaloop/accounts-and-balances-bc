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
exports.AccountsAndBalancesHttpClient = void 0;
var axios_1 = require("axios");
var errors_1 = require("./errors");
// TODO: put error-handling code inside a function to avoid repetition?
var AccountsAndBalancesHttpClient = /** @class */ (function () {
    function AccountsAndBalancesHttpClient(logger, baseUrlHttpService, timeoutMs, accessToken) {
        this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE = "unable to reach server";
        this.logger = logger;
        this.httpClient = axios_1.default.create({
            baseURL: baseUrlHttpService,
            timeout: timeoutMs
        });
        // "headers: {"Authorization": `Bearer ${accessToken}`}" could be passed to axios.create(), but that way, due
        // to a bug, it wouldn't be possible to change the access token later.
        this.setAccessToken(accessToken);
    }
    AccountsAndBalancesHttpClient.prototype.setAccessToken = function (accessToken) {
        this.httpClient.defaults.headers.common["Authorization"] = "Bearer ".concat(accessToken);
    };
    AccountsAndBalancesHttpClient.prototype.createAccount = function (accountDto) {
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_1, axiosError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.post("/accounts", accountDto)];
                    case 1:
                        axiosResponse = _a.sent();
                        return [2 /*return*/, axiosResponse.data.accountId];
                    case 2:
                        e_1 = _a.sent();
                        if (axios_1.default.isAxiosError(e_1)) {
                            axiosError = e_1;
                            if (axiosError.response !== undefined) {
                                throw new errors_1.UnableToCreateAccountError(axiosError.response.data.message);
                            }
                            throw new errors_1.UnableToCreateAccountError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
                        }
                        throw new errors_1.UnableToCreateAccountError(e_1 === null || e_1 === void 0 ? void 0 : e_1.message);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AccountsAndBalancesHttpClient.prototype.createJournalEntries = function (journalEntryDtos) {
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_2, axiosError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.post("/journalEntries", journalEntryDtos)];
                    case 1:
                        axiosResponse = _a.sent();
                        return [2 /*return*/, axiosResponse.data.idsJournalEntries];
                    case 2:
                        e_2 = _a.sent();
                        if (axios_1.default.isAxiosError(e_2)) {
                            axiosError = e_2;
                            if (axiosError.response !== undefined) {
                                throw new errors_1.UnableToCreateJournalEntriesError(axiosError.response.data.message);
                            }
                            throw new errors_1.UnableToCreateJournalEntriesError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
                        }
                        throw new errors_1.UnableToCreateJournalEntriesError(e_2 === null || e_2 === void 0 ? void 0 : e_2.message);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AccountsAndBalancesHttpClient.prototype.getAccountById = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_3, axiosError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.get("/accounts?id=".concat(accountId), {
                                validateStatus: function (statusCode) {
                                    return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
                                }
                            })];
                    case 1:
                        axiosResponse = _a.sent();
                        if (axiosResponse.status === 404) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, axiosResponse.data.account];
                    case 2:
                        e_3 = _a.sent();
                        if (axios_1.default.isAxiosError(e_3)) {
                            axiosError = e_3;
                            if (axiosError.response !== undefined) {
                                throw new errors_1.UnableToGetAccountError(axiosError.response.data.message);
                            }
                            throw new errors_1.UnableToGetAccountError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
                        }
                        throw new errors_1.UnableToGetAccountError(e_3 === null || e_3 === void 0 ? void 0 : e_3.message);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AccountsAndBalancesHttpClient.prototype.getAccountsByExternalId = function (externalId) {
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_4, axiosError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.get("/accounts?externalId=".concat(externalId), {
                                validateStatus: function (statusCode) {
                                    return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
                                }
                            })];
                    case 1:
                        axiosResponse = _a.sent();
                        if (axiosResponse.status === 404) {
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, axiosResponse.data.accounts];
                    case 2:
                        e_4 = _a.sent();
                        if (axios_1.default.isAxiosError(e_4)) {
                            axiosError = e_4;
                            if (axiosError.response !== undefined) {
                                throw new errors_1.UnableToGetAccountsError(axiosError.response.data.message);
                            }
                            throw new errors_1.UnableToGetAccountsError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
                        }
                        throw new errors_1.UnableToGetAccountsError(e_4 === null || e_4 === void 0 ? void 0 : e_4.message);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AccountsAndBalancesHttpClient.prototype.getJournalEntriesByAccountId = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_5, axiosError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.get("/journalEntries?accountId=".concat(accountId), {
                                validateStatus: function (statusCode) {
                                    return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
                                }
                            })];
                    case 1:
                        axiosResponse = _a.sent();
                        if (axiosResponse.status === 404) {
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, axiosResponse.data.journalEntries];
                    case 2:
                        e_5 = _a.sent();
                        if (axios_1.default.isAxiosError(e_5)) {
                            axiosError = e_5;
                            if (axiosError.response !== undefined) {
                                throw new errors_1.UnableToGetJournalEntriesError(axiosError.response.data.message);
                            }
                            throw new errors_1.UnableToGetJournalEntriesError(this.UNABLE_TO_REACH_SERVER_ERROR_MESSAGE);
                        }
                        throw new errors_1.UnableToGetJournalEntriesError(e_5 === null || e_5 === void 0 ? void 0 : e_5.message);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AccountsAndBalancesHttpClient;
}());
exports.AccountsAndBalancesHttpClient = AccountsAndBalancesHttpClient;
