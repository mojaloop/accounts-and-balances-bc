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
export class InvalidAccountIdTypeError extends Error {}
export class InvalidAccountStateTypeError extends Error {}
export class InvalidAccountStateError extends Error {}
export class InvalidAccountTypeTypeError extends Error {}
export class InvalidAccountTypeError extends Error {}
export class InvalidCreditBalanceTypeError extends Error {}
export class InvalidCreditBalanceError extends Error {}
export class InvalidDebitBalanceTypeError extends Error {}
export class InvalidDebitBalanceError extends Error {}
export class InvalidBalanceTypeError extends Error {}
export class InvalidBalanceError extends Error {}

// JournalEntry.
export class InvalidJournalEntryIdTypeError extends Error {}
export class InvalidExtCategoryTypeError extends Error {}
export class InvalidJournalEntryAmountTypeError extends Error {}
export class InvalidJournalEntryAmountError extends Error {}
export class InvalidCreditedAccountIdTypeError extends Error {}
export class InvalidDebitedAccountIdTypeError extends Error {}

// Account and JournalEntry.
export class InvalidExtIdTypeError extends Error {}
export class InvalidCurrencyTypeError extends Error {}
export class InvalidTimeStampTypeError extends Error {}

// Repo.
export class UnableToInitRepoError extends Error {}
// Item already exists.
export class AccountAlreadyExistsError extends Error {}
export class JournalEntryAlreadyExistsError extends Error {}
// No such item.
export class NoSuchAccountError extends Error {}
export class NoSuchCreditedAccountError extends Error {}
export class NoSuchDebitedAccountError extends Error {}
export class NoSuchJournalEntryError extends Error {}
// Stores.
export class UnableToStoreAccountError extends Error {}
export class UnableToStoreJournalEntryError extends Error {}
// Gets.
export class UnableToGetAccountError extends Error {}
export class UnableToGetJournalEntryError extends Error {}
export class UnableToGetAccountsError extends Error {}
export class UnableToGetJournalEntriesError extends Error {}
// Updates.
export class UnableToUpdateAccountError extends Error {}
// Deletes.
export class UnableToDeleteAccountError extends Error {}
export class UnableToDeleteJournalEntryError extends Error {}
export class UnableToDeleteAccountsError extends Error {}
export class UnableToDeleteJournalEntriesError extends Error {}

// Others.
export class CreditedAccountAndDebitedAccountCurrenciesDifferError extends Error {}
