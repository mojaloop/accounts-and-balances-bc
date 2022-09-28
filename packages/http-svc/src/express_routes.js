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
exports.ExpressRoutes = void 0;
var express_1 = require("express");
var accounts_and_balances_bc_domain_lib_1 = require("@mojaloop/accounts-and-balances-bc-domain-lib");
var BEARER_LENGTH = 2; // TODO: why 2?
var ExpressRoutes = /** @class */ (function () {
    function ExpressRoutes(logger, tokenHelper, aggregate) {
        this.logger = logger;
        this.tokenHelper = tokenHelper;
        this.aggregate = aggregate;
        this._router = (0, express_1.Router)();
        this.setUp();
    }
    ExpressRoutes.prototype.setUp = function () {
        // Inject authentication - all requests require a valid token. TODO: clarify.
        this._router.use(this.authenticate.bind(this)); // All requests require authentication.
        // Posts.
        this._router.post("/accounts", this.postAccount.bind(this));
        this._router.post("/journalEntries", this.postJournalEntries.bind(this));
        // Gets.
        this._router.get("/accounts", this.accounts.bind(this)); // TODO: function name.
        this._router.get("/journalEntries", this.journalEntries.bind(this)); // TODO: function name.
    };
    Object.defineProperty(ExpressRoutes.prototype, "router", {
        get: function () {
            return this._router;
        },
        enumerable: false,
        configurable: true
    });
    // TODO: name; NextFunction; clarify; why returns? logs vs error responses. all status codes 403?
    ExpressRoutes.prototype.authenticate = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var authorizationHeader, bearer, bearerToken, verified, e_1, decodedToken, subSplit, subjectType, subject;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        authorizationHeader = req.headers["authorization"];
                        if (authorizationHeader === undefined) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                            return [2 /*return*/];
                        }
                        bearer = authorizationHeader.trim().split(" ");
                        if (bearer.length != BEARER_LENGTH) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                            return [2 /*return*/];
                        }
                        bearerToken = bearer[1];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.tokenHelper.verifyToken(bearerToken)];
                    case 2:
                        verified = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        this.logger.error(e_1);
                        this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                        );
                        return [2 /*return*/];
                    case 4:
                        if (!verified) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                            return [2 /*return*/];
                        }
                        decodedToken = this.tokenHelper.decodeToken(bearerToken);
                        if (decodedToken === undefined // TODO: undefined?
                            || decodedToken === null // TODO: null?
                            || decodedToken.sub.indexOf("::") === -1) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                            return [2 /*return*/];
                        }
                        subSplit = decodedToken.sub.split("::");
                        subjectType = subSplit[0];
                        subject = subSplit[1];
                        req.securityContext = {
                            username: subjectType.toUpperCase().startsWith("USER") ? subject : null,
                            clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null,
                            rolesIds: decodedToken.roles,
                            accessToken: bearerToken
                        };
                        /*req.securityContext = {
                            username: "",
                            clientId: "",
                            rolesIds: [""],
                            accessToken: ""
                        }*/
                        next();
                        return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.postAccount = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var accountId, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.aggregate.createAccount(req.body, req.securityContext)];
                    case 1:
                        accountId = _a.sent();
                        this.sendSuccessResponse(res, 201, { accountId: accountId });
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _a.sent();
                        if (e_2 instanceof accounts_and_balances_bc_domain_lib_1.InvalidExternalIdError) {
                            this.sendErrorResponse(res, 400, "invalid external id");
                        }
                        else if (e_2 instanceof accounts_and_balances_bc_domain_lib_1.InvalidCreditBalanceError) {
                            this.sendErrorResponse(res, 400, "invalid credit balance");
                        }
                        else if (e_2 instanceof accounts_and_balances_bc_domain_lib_1.InvalidDebitBalanceError) {
                            this.sendErrorResponse(res, 400, "invalid debit balance");
                        }
                        else if (e_2 instanceof accounts_and_balances_bc_domain_lib_1.AccountAlreadyExistsError) {
                            this.sendErrorResponse(res, 409, "account already exists");
                        }
                        else if (e_2 instanceof accounts_and_balances_bc_domain_lib_1.UnauthorizedError) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                        }
                        else {
                            this.sendErrorResponse(res, 500, ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.postJournalEntries = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var idsJournalEntries, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.aggregate.createJournalEntries(req.body, req.securityContext)];
                    case 1:
                        idsJournalEntries = _a.sent();
                        this.sendSuccessResponse(res, 201, { idsJournalEntries: idsJournalEntries });
                        return [3 /*break*/, 3];
                    case 2:
                        e_3 = _a.sent();
                        if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.InvalidExternalIdError) {
                            this.sendErrorResponse(res, 400, "invalid external id");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.InvalidExternalCategoryError) {
                            this.sendErrorResponse(res, 400, "invalid external category");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.InvalidJournalEntryAmountError) {
                            this.sendErrorResponse(res, 400, "invalid journal entry amount");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.CreditedAndDebitedAccountsAreTheSameError) {
                            this.sendErrorResponse(res, 400, "credited and debited accounts are the same");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.NoSuchCreditedAccountError) {
                            this.sendErrorResponse(res, 400, "no such credited account");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.NoSuchDebitedAccountError) {
                            this.sendErrorResponse(res, 400, "no such debited account");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.CurrenciesDifferError) {
                            this.sendErrorResponse(res, 400, "currencies differ");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.InsufficientBalanceError) {
                            this.sendErrorResponse(res, 400, "insufficient balance");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.JournalEntryAlreadyExistsError) {
                            this.sendErrorResponse(res, 409, "journal entry already exists");
                        }
                        else if (e_3 instanceof accounts_and_balances_bc_domain_lib_1.UnauthorizedError) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                        }
                        else {
                            this.sendErrorResponse(res, 500, ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.accounts = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(req.query.id !== undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getAccountById(req, res)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        if (!(req.query.externalId !== undefined)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.getAccountsByExternalId(req, res)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                    case 4:
                        this.sendErrorResponse(// TODO: should this be done?
                        res, 400, // TODO: status code.
                        "invalid query");
                        return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.journalEntries = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(req.query.accountId !== undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getJournalEntriesByAccountId(req, res)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        this.sendErrorResponse(// TODO: should this be done?
                        res, 400, // TODO: status code.
                        "invalid query");
                        return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.getAccountById = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var accountDto, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.aggregate.getAccountById(req.query.id, req.securityContext)];
                    case 1:
                        accountDto = _a.sent();
                        if (accountDto === null) {
                            this.sendErrorResponse(res, 404, "no such account");
                            return [2 /*return*/];
                        }
                        this.sendSuccessResponse(res, 200, { account: accountDto });
                        return [3 /*break*/, 3];
                    case 2:
                        e_4 = _a.sent();
                        if (e_4 instanceof accounts_and_balances_bc_domain_lib_1.UnauthorizedError) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                        }
                        else {
                            this.sendErrorResponse(res, 500, ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.getAccountsByExternalId = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var accountDtos, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.aggregate.getAccountsByExternalId(req.query.externalId, req.securityContext)];
                    case 1:
                        accountDtos = _a.sent();
                        if (accountDtos.length === 0) {
                            this.sendErrorResponse(res, 404, "no accounts with the specified external id");
                            return [2 /*return*/];
                        }
                        this.sendSuccessResponse(res, 200, { accounts: accountDtos });
                        return [3 /*break*/, 3];
                    case 2:
                        e_5 = _a.sent();
                        if (e_5 instanceof accounts_and_balances_bc_domain_lib_1.UnauthorizedError) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                        }
                        else {
                            this.sendErrorResponse(res, 500, ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.getJournalEntriesByAccountId = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var journalEntryDtos, e_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.aggregate.getJournalEntriesByAccountId(req.query.accountId, req.securityContext)];
                    case 1:
                        journalEntryDtos = _a.sent();
                        if (journalEntryDtos.length === 0) {
                            this.sendErrorResponse(res, 404, "no journal entries with the specified account id");
                            return [2 /*return*/];
                        }
                        this.sendSuccessResponse(res, 200, { journalEntries: journalEntryDtos });
                        return [3 /*break*/, 3];
                    case 2:
                        e_6 = _a.sent();
                        if (e_6 instanceof accounts_and_balances_bc_domain_lib_1.UnauthorizedError) {
                            this.sendErrorResponse(res, 403, "unauthorized" // TODO: verify.
                            );
                        }
                        else {
                            this.sendErrorResponse(res, 500, ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExpressRoutes.prototype.sendErrorResponse = function (res, statusCode, message) {
        res.status(statusCode).json({ message: message });
    };
    ExpressRoutes.prototype.sendSuccessResponse = function (res, statusCode, data) {
        res.status(statusCode).json(data);
    };
    // Other properties.
    ExpressRoutes.UNKNOWN_ERROR_MESSAGE = "unknown error";
    return ExpressRoutes;
}());
exports.ExpressRoutes = ExpressRoutes;
