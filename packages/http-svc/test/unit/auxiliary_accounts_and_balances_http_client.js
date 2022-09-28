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
exports.AuxiliaryAccountsAndBalancesHttpClient = void 0;
var axios_1 = require("axios");
var AuxiliaryAccountsAndBalancesHttpClient = /** @class */ (function () {
    function AuxiliaryAccountsAndBalancesHttpClient(logger, baseUrlHttpService, timeoutMs, accessToken) {
        this.logger = logger;
        this.httpClient = axios_1.default.create({
            baseURL: baseUrlHttpService,
            timeout: timeoutMs
        });
        // "headers: {"Authorization": `Bearer ${accessToken}`}" could be passed to axios.create(), but that way, due
        // to a bug, it wouldn't be possible to change the access token later.
        this.setAccessToken(accessToken);
    }
    AuxiliaryAccountsAndBalancesHttpClient.prototype.setAccessToken = function (accessToken) {
        this.httpClient.defaults.headers.common["Authorization"] = "Bearer ".concat(accessToken);
    };
    AuxiliaryAccountsAndBalancesHttpClient.prototype.createAccount = function (accountDto) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.post("/accounts", accountDto)];
                    case 1:
                        axiosResponse = _c.sent();
                        return [2 /*return*/, axiosResponse.status];
                    case 2:
                        e_1 = _c.sent();
                        return [2 /*return*/, (_b = (_a = e_1.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : -1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuxiliaryAccountsAndBalancesHttpClient.prototype.createJournalEntries = function (journalEntryDtos) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.post("/journalEntries", journalEntryDtos)];
                    case 1:
                        axiosResponse = _c.sent();
                        return [2 /*return*/, axiosResponse.status];
                    case 2:
                        e_2 = _c.sent();
                        return [2 /*return*/, (_b = (_a = e_2.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : -1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuxiliaryAccountsAndBalancesHttpClient.prototype.getAccountById = function (accountId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.get("/accounts?id=".concat(accountId))];
                    case 1:
                        axiosResponse = _c.sent();
                        return [2 /*return*/, axiosResponse.status];
                    case 2:
                        e_3 = _c.sent();
                        return [2 /*return*/, (_b = (_a = e_3.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : -1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuxiliaryAccountsAndBalancesHttpClient.prototype.getAccountsByExternalId = function (externalId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.get("/accounts?externalId=".concat(externalId))];
                    case 1:
                        axiosResponse = _c.sent();
                        return [2 /*return*/, axiosResponse.status];
                    case 2:
                        e_4 = _c.sent();
                        return [2 /*return*/, (_b = (_a = e_4.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : -1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuxiliaryAccountsAndBalancesHttpClient.prototype.getJournalEntriesByAccountId = function (accountId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var axiosResponse, e_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.httpClient.get("/journalEntries?accountId=".concat(accountId))];
                    case 1:
                        axiosResponse = _c.sent();
                        return [2 /*return*/, axiosResponse.status];
                    case 2:
                        e_5 = _c.sent();
                        return [2 /*return*/, (_b = (_a = e_5.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : -1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AuxiliaryAccountsAndBalancesHttpClient;
}());
exports.AuxiliaryAccountsAndBalancesHttpClient = AuxiliaryAccountsAndBalancesHttpClient;
