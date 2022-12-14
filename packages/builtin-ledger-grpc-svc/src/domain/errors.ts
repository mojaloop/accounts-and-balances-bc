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

// Account.
export class InvalidAccountStateError extends Error {readonly message = "invalid account state";}
export class InvalidAccountTypeError extends Error {readonly message = "invalid account type";}
export class InvalidDebitBalanceError extends Error {readonly message = "invalid debit balance";}
export class InvalidCreditBalanceError extends Error {readonly message = "invalid credit balance";}
// JournalEntry.
export class InvalidJournalEntryAmountError extends Error {readonly message = "invalid journal entry amount";}
export class SameDebitedAndCreditedAccountsError extends Error {readonly message = "same debited and credited accounts";}
export class DebitedAccountNotFoundError extends Error {readonly message = "no such debited account";}
export class CreditedAccountNotFoundError extends Error {readonly message = "no such credited account";}
export class CurrencyCodesDifferError extends Error {readonly message = "currency codes differ";}
export class DebitBalanceExceedsCreditBalanceError extends Error {readonly message = "debit balance exceeds credit balance";}
export class CreditBalanceExceedsDebitBalanceError extends Error {readonly message = "credit balance exceeds debit balance";}
// Common.
export class InvalidIdError extends Error {readonly message = "invalid id";}
export class InvalidExternalIdError extends Error {readonly message = "invalid external id";}
export class InvalidCurrencyCodeError extends Error {readonly message = "invalid currency code";}
export class InvalidCurrencyDecimalsError extends Error {readonly message = "invalid currency decimals";}
export class InvalidTimestampError extends Error {readonly message = "invalid timestamp";}
// Repos.
export class UnableToInitRepoError extends Error {readonly message = "unable to init repo";}
export class AccountAlreadyExistsError extends Error {readonly message = "account already exists";}
export class AccountNotFoundError extends Error {readonly message = "no such account";}
export class UnableToStoreAccountError extends Error {readonly message = "unable to store account";}
export class UnableToGetAccountError extends Error {readonly message = "unable to get account";}
export class UnableToGetAccountsError extends Error {readonly message = "unable to get accounts";}
export class UnableToUpdateAccountError extends Error {readonly message = "unable to update account";}
export class JournalEntryAlreadyExistsError extends Error {readonly message = "journal entry already exists";}
export class UnableToStoreJournalEntryError extends Error {readonly message = "unable to store journal entry";}
export class UnableToGetJournalEntryError extends Error {readonly message = "unable to get journal entry";}
export class UnableToGetJournalEntriesError extends Error {readonly message = "unable to get journal entries";}
// Others.
export class UnauthorizedError extends Error {readonly message = "unauthorized";}
