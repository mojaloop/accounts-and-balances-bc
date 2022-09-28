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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnableToGetJournalEntriesError = exports.UnableToCreateJournalEntriesError = exports.UnableToGetAccountsError = exports.UnableToGetAccountError = exports.UnableToCreateAccountError = void 0;
var UnableToCreateAccountError = /** @class */ (function (_super) {
    __extends(UnableToCreateAccountError, _super);
    function UnableToCreateAccountError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UnableToCreateAccountError;
}(Error));
exports.UnableToCreateAccountError = UnableToCreateAccountError;
var UnableToGetAccountError = /** @class */ (function (_super) {
    __extends(UnableToGetAccountError, _super);
    function UnableToGetAccountError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UnableToGetAccountError;
}(Error));
exports.UnableToGetAccountError = UnableToGetAccountError;
var UnableToGetAccountsError = /** @class */ (function (_super) {
    __extends(UnableToGetAccountsError, _super);
    function UnableToGetAccountsError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UnableToGetAccountsError;
}(Error));
exports.UnableToGetAccountsError = UnableToGetAccountsError;
var UnableToCreateJournalEntriesError = /** @class */ (function (_super) {
    __extends(UnableToCreateJournalEntriesError, _super);
    function UnableToCreateJournalEntriesError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UnableToCreateJournalEntriesError;
}(Error));
exports.UnableToCreateJournalEntriesError = UnableToCreateJournalEntriesError;
var UnableToGetJournalEntriesError = /** @class */ (function (_super) {
    __extends(UnableToGetJournalEntriesError, _super);
    function UnableToGetJournalEntriesError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UnableToGetJournalEntriesError;
}(Error));
exports.UnableToGetJournalEntriesError = UnableToGetJournalEntriesError;
