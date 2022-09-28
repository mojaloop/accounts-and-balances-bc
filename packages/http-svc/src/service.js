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
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = exports.start = void 0;
var logging_bc_public_types_lib_1 = require("@mojaloop/logging-bc-public-types-lib");
var logging_bc_client_lib_1 = require("@mojaloop/logging-bc-client-lib");
var accounts_and_balances_bc_domain_lib_1 = require("@mojaloop/accounts-and-balances-bc-domain-lib");
var accounts_and_balances_bc_infrastructure_lib_1 = require("@mojaloop/accounts-and-balances-bc-infrastructure-lib");
var auditing_bc_client_lib_1 = require("@mojaloop/auditing-bc-client-lib");
var fs_1 = require("fs");
var security_bc_client_lib_1 = require("@mojaloop/security-bc-client-lib");
var express_http_server_1 = require("./express_http_server");
/* ********** Constants Begin ********** */
// General.
var BOUNDED_CONTEXT_NAME = "accounts-and-balances-bc";
var SERVICE_NAME = "http-svc";
var SERVICE_VERSION = "0.0.1";
// Message broker.
var MESSAGE_BROKER_HOST = (_a = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_HOST) !== null && _a !== void 0 ? _a : "localhost";
var MESSAGE_BROKER_PORT_NO = parseInt((_b = process.env.ACCOUNTS_AND_BALANCES_MESSAGE_BROKER_PORT_NO) !== null && _b !== void 0 ? _b : "") || 9092;
var MESSAGE_BROKER_URL = "".concat(MESSAGE_BROKER_HOST, ":").concat(MESSAGE_BROKER_PORT_NO);
// Logging.
var LOGGING_LEVEL = logging_bc_public_types_lib_1.LogLevel.INFO;
var LOGGING_TOPIC = (_c = process.env.ACCOUNTS_AND_BALANCES_LOGGING_TOPIC) !== null && _c !== void 0 ? _c : "logs";
// Token helper. TODO: names and values.
var TOKEN_HELPER_ISSUER_NAME = (_d = process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_ISSUER_NAME) !== null && _d !== void 0 ? _d : "http://localhost:3201/";
var TOKEN_HELPER_JWKS_URL = (_e = process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_JWKS_URL) !== null && _e !== void 0 ? _e : "http://localhost:3201/.well-known/jwks.json";
var TOKEN_HELPER_AUDIENCE = (_f = process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_AUDIENCE) !== null && _f !== void 0 ? _f : "mojaloop.vnext.default_audience";
// Authorization.
var AUTHORIZATION_SERVICE_HOST = "localhost";
var AUTHORIZATION_SERVICE_PORT_NO = 3202;
var BASE_URL_AUTHORIZATION_SERVICE = (_g = process.env.ACCOUNTS_AND_BALANCES_TOKEN_HELPER_AUDIENCE) !== null && _g !== void 0 ? _g : "http://".concat(AUTHORIZATION_SERVICE_HOST, ":").concat(AUTHORIZATION_SERVICE_PORT_NO);
// Auditing.
var AUDITING_CERT_FILE_PATH = (_h = process.env.ACCOUNTS_AND_BALANCES_AUDITING_CERT_FILE_PATH) !== null && _h !== void 0 ? _h : "./auditing_cert"; // TODO: file name.
var AUDITING_TOPIC = (_j = process.env.ACCOUNTS_AND_BALANCES_AUDITING_TOPIC) !== null && _j !== void 0 ? _j : "audits";
// Data base.
var DB_HOST = (_k = process.env.ACCOUNTS_AND_BALANCES_DB_HOST) !== null && _k !== void 0 ? _k : "localhost";
var DB_PORT_NO = parseInt((_l = process.env.ACCOUNTS_AND_BALANCES_DB_PORT_NO) !== null && _l !== void 0 ? _l : "") || 27017;
var DB_URL = "mongodb://".concat(DB_HOST, ":").concat(DB_PORT_NO);
var DB_NAME = "accounts-and-balances";
var ACCOUNTS_COLLECTION_NAME = "accounts";
var JOURNAL_ENTRIES_COLLECTION_NAME = "journal-entries";
// Server.
var HTTP_SERVER_HOST = process.env.ACCOUNTS_AND_BALANCES_HTTP_SERVER_HOST || "localhost";
var HTTP_SERVER_PORT_NO = parseInt(process.env.ACCOUNTS_AND_BALANCES_HTTP_SERVER_PORT_NO || "") || 1234;
/* ********** Constants End ********** */
var logger;
var auditingClient;
var accountsRepo;
var journalEntriesRepo;
var httpServer;
function start(_logger, authorizationClient, _auditingClient, _accountsRepo, _journalEntriesRepo) {
    return __awaiter(this, void 0, void 0, function () {
        var kafkaProducerOptions, e_1, tokenHelper, e_2, cryptoProvider, auditDispatcher, e_3, e_4, e_5, aggregate, e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    kafkaProducerOptions = {
                        kafkaBrokerList: MESSAGE_BROKER_URL
                    };
                    if (!(_logger !== undefined)) return [3 /*break*/, 1];
                    logger = _logger;
                    return [3 /*break*/, 6];
                case 1:
                    logger = new logging_bc_client_lib_1.KafkaLogger(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION, kafkaProducerOptions, LOGGING_TOPIC, LOGGING_LEVEL);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, logger.init()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    e_1 = _a.sent();
                    logger.fatal(e_1);
                    return [4 /*yield*/, stop()];
                case 5:
                    _a.sent();
                    process.exit(-1); // TODO: verify code.
                    return [3 /*break*/, 6];
                case 6:
                    tokenHelper = new security_bc_client_lib_1.TokenHelper(TOKEN_HELPER_ISSUER_NAME, TOKEN_HELPER_JWKS_URL, TOKEN_HELPER_AUDIENCE, logger);
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 9, , 11]);
                    return [4 /*yield*/, tokenHelper.init()];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 9:
                    e_2 = _a.sent();
                    logger.fatal(e_2);
                    return [4 /*yield*/, stop()];
                case 10:
                    _a.sent();
                    process.exit(-1); // TODO: verify code.
                    return [3 /*break*/, 11];
                case 11:
                    if (!(authorizationClient === undefined)) return [3 /*break*/, 14];
                    authorizationClient = new security_bc_client_lib_1.AuthorizationClient(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION, BASE_URL_AUTHORIZATION_SERVICE, logger);
                    addPrivileges(authorizationClient);
                    return [4 /*yield*/, authorizationClient.bootstrap(true)];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, authorizationClient.fetch()];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    if (!(_auditingClient !== undefined)) return [3 /*break*/, 15];
                    auditingClient = _auditingClient;
                    return [3 /*break*/, 20];
                case 15:
                    if (!(0, fs_1.existsSync)(AUDITING_CERT_FILE_PATH)) {
                        // TODO: clarify.
                        /*if (PRODUCTION_MODE) {
                            process.exit(9); // TODO: verify code.
                        }*/
                        auditing_bc_client_lib_1.LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDITING_CERT_FILE_PATH, 2048); // TODO: Put this in a constant.
                    }
                    cryptoProvider = new auditing_bc_client_lib_1.LocalAuditClientCryptoProvider(AUDITING_CERT_FILE_PATH);
                    auditDispatcher = new auditing_bc_client_lib_1.KafkaAuditClientDispatcher(kafkaProducerOptions, AUDITING_TOPIC, logger);
                    auditingClient = new auditing_bc_client_lib_1.AuditClient(BOUNDED_CONTEXT_NAME, SERVICE_NAME, SERVICE_VERSION, cryptoProvider, auditDispatcher);
                    _a.label = 16;
                case 16:
                    _a.trys.push([16, 18, , 20]);
                    return [4 /*yield*/, auditingClient.init()];
                case 17:
                    _a.sent();
                    return [3 /*break*/, 20];
                case 18:
                    e_3 = _a.sent();
                    logger.fatal(e_3);
                    return [4 /*yield*/, stop()];
                case 19:
                    _a.sent();
                    process.exit(-1); // TODO: verify code.
                    return [3 /*break*/, 20];
                case 20:
                    if (!(_accountsRepo !== undefined)) return [3 /*break*/, 21];
                    accountsRepo = _accountsRepo;
                    return [3 /*break*/, 26];
                case 21:
                    accountsRepo = new accounts_and_balances_bc_infrastructure_lib_1.MongoAccountsRepo(logger, DB_URL, DB_NAME, ACCOUNTS_COLLECTION_NAME);
                    _a.label = 22;
                case 22:
                    _a.trys.push([22, 24, , 26]);
                    return [4 /*yield*/, accountsRepo.init()];
                case 23:
                    _a.sent();
                    return [3 /*break*/, 26];
                case 24:
                    e_4 = _a.sent();
                    logger.fatal(e_4);
                    return [4 /*yield*/, stop()];
                case 25:
                    _a.sent();
                    process.exit(-1); // TODO: verify code.
                    return [3 /*break*/, 26];
                case 26:
                    if (!(_journalEntriesRepo !== undefined)) return [3 /*break*/, 27];
                    journalEntriesRepo = _journalEntriesRepo;
                    return [3 /*break*/, 32];
                case 27:
                    journalEntriesRepo = new accounts_and_balances_bc_infrastructure_lib_1.MongoJournalEntriesRepo(logger, DB_URL, DB_NAME, JOURNAL_ENTRIES_COLLECTION_NAME);
                    _a.label = 28;
                case 28:
                    _a.trys.push([28, 30, , 32]);
                    return [4 /*yield*/, journalEntriesRepo.init()];
                case 29:
                    _a.sent();
                    return [3 /*break*/, 32];
                case 30:
                    e_5 = _a.sent();
                    logger.fatal(e_5);
                    return [4 /*yield*/, stop()];
                case 31:
                    _a.sent();
                    process.exit(-1); // TODO: verify code.
                    return [3 /*break*/, 32];
                case 32:
                    aggregate = new accounts_and_balances_bc_domain_lib_1.Aggregate(logger, authorizationClient, auditingClient, accountsRepo, journalEntriesRepo);
                    // HTTP server.
                    httpServer = new express_http_server_1.ExpressHttpServer(logger, tokenHelper, aggregate, HTTP_SERVER_HOST, HTTP_SERVER_PORT_NO);
                    _a.label = 33;
                case 33:
                    _a.trys.push([33, 35, , 37]);
                    return [4 /*yield*/, httpServer.start()];
                case 34:
                    _a.sent();
                    return [3 /*break*/, 37];
                case 35:
                    e_6 = _a.sent();
                    logger.fatal(e_6);
                    return [4 /*yield*/, stop()];
                case 36:
                    _a.sent();
                    process.exit(-1); // TODO: verify code.
                    return [3 /*break*/, 37];
                case 37: return [2 /*return*/];
            }
        });
    });
}
exports.start = start;
function addPrivileges(authorizationClient) {
    authorizationClient.addPrivilege(accounts_and_balances_bc_domain_lib_1.Privileges.CREATE_ACCOUNT, "CREATE_ACCOUNT", "Allows the creation of accounts." // TODO: verify.
    );
    authorizationClient.addPrivilege(accounts_and_balances_bc_domain_lib_1.Privileges.CREATE_JOURNAL_ENTRY, "CREATE_JOURNAL_ENTRY", "Allows the creation of journal entries." // TODO: verify.
    );
    authorizationClient.addPrivilege(accounts_and_balances_bc_domain_lib_1.Privileges.VIEW_ACCOUNT, "VIEW_ACCOUNT", "Allows the retrieval of accounts." // TODO: verify.
    );
    authorizationClient.addPrivilege(accounts_and_balances_bc_domain_lib_1.Privileges.VIEW_JOURNAL_ENTRY, "VIEW_JOURNAL_ENTRY", "Allows the retrieval of journal entries." // TODO: verify.
    );
}
// TODO: verify ifs.
function stop() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!httpServer) return [3 /*break*/, 2];
                    return [4 /*yield*/, httpServer.stop()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    if (!accountsRepo) return [3 /*break*/, 4];
                    return [4 /*yield*/, accountsRepo.destroy()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    if (!journalEntriesRepo) return [3 /*break*/, 6];
                    return [4 /*yield*/, journalEntriesRepo.destroy()];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    if (!auditingClient) return [3 /*break*/, 8];
                    return [4 /*yield*/, auditingClient.destroy()];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    if (!(logger instanceof logging_bc_client_lib_1.KafkaLogger)) return [3 /*break*/, 10];
                    return [4 /*yield*/, logger.destroy()];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.stop = stop;
process.on("SIGINT", handleIntAndTermSignals.bind(this)); // Ctrl + c.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
function handleIntAndTermSignals(signal) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info("".concat(signal, " received"));
                    return [4 /*yield*/, stop()];
                case 1:
                    _a.sent();
                    process.exit(); // TODO: required? exit code.
                    return [2 /*return*/];
            }
        });
    });
}
process.on("exit", function () {
    console.info("".concat(SERVICE_NAME, " exited"));
});
