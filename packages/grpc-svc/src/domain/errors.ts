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

export class AccountAlreadyExistsError extends Error {readonly message = "account already exists";}
export class AccountNotFoundError extends Error {readonly message = "account not found";}
export class InvalidDebitBalanceError extends Error {readonly message = "invalid debit balance";}
export class InvalidCreditBalanceError extends Error {readonly message = "invalid credit balance";}
export class InvalidBalanceError extends Error {readonly message = "invalid balance";}
export class InvalidTimestampError extends Error {readonly message = "invalid timestamp";}
export class InvalidIdError extends Error {readonly message = "invalid id";}
export class InvalidOwnerIdError extends Error {readonly message = "invalid owner id";}
export class InvalidCurrencyCodeError extends Error {readonly message = "invalid currency code";}
// Repo-only.
export class UnableToInitRepoError extends Error {readonly message = "unable to init repo";}
export class UnableToStoreAccountsError extends Error {readonly message = "unable to store accounts";}
export class UnableToGetAccountsError extends Error {readonly message = "unable to get accounts";}
export class UnableToUpdateAccountsError extends Error {readonly message = "unable to update accounts";}
// Others.
// LedgerError is used to pass error messages from a ledger to the aggregate through a ledger adapter. This is needed
// to make a distinction between the messages that are supposed to be shown to the client and the ones that are not.
export class LedgerError extends Error {}
