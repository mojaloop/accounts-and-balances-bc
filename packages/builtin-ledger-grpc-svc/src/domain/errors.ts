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

// Account.
export class BLInvalidAccountStateError extends Error {readonly message = "invalid account state";}
export class BLInvalidAccountTypeError extends Error {readonly message = "invalid account type";}
export class BLInvalidDebitBalanceError extends Error {readonly message = "invalid debit balance";}
export class BLInvalidCreditBalanceError extends Error {readonly message = "invalid credit balance";}
// JournalEntry.
export class BLInvalidJournalEntryAmountError extends Error {readonly message = "invalid journal entry amount";}
export class BLSameDebitedAndCreditedAccountsError extends Error {readonly message = "same debited and credited accounts";}
export class BLDebitedAccountNotFoundError extends Error {readonly message = "debited account not found";}
export class BLCreditedAccountNotFoundError extends Error {readonly message = "credited account not found";}
export class BLCurrencyCodesDifferError extends Error {readonly message = "currency codes differ";}
export class CurrencyDecimalsDifferError extends Error {readonly message = "currency decimals differ";}
export class BLDebitsExceedCreditsError extends Error {readonly message = "debits exceed credits";}
export class BLCreditsExceedDebitsError extends Error {readonly message = "credits exceed debits";}
// Common.
export class BLInvalidIdError extends Error {readonly message = "invalid id";}
export class BLInvalidCurrencyCodeError extends Error {readonly message = "invalid currency code";}
export class BLInvalidTimestampError extends Error {readonly message = "invalid timestamp";}
// Repos.
export class BLUnableToInitRepoError extends Error {readonly message = "unable to init repo";}
export class BLAccountAlreadyExistsError extends Error {readonly message = "account already exists";}
export class BLAccountNotFoundError extends Error {readonly message = "account not found";}
export class BLUnableToStoreAccountError extends Error {readonly message = "unable to store account";}
export class BLUnableToGetAccountsError extends Error {readonly message = "unable to get accounts";}
export class BLUnableToUpdateAccountError extends Error {readonly message = "unable to update account";}
export class BLUnableToUpdateAccountsError extends Error {readonly message = "unable to update accounts";}
export class BLJournalEntryAlreadyExistsError extends Error {readonly message = "journal entry already exists";}
export class BLUnableToStoreJournalEntryError extends Error {readonly message = "unable to store journal entry";}
export class BLUnableToGetJournalEntriesError extends Error {readonly message = "unable to get journal entries";}
// Others.
export class BLUnauthorizedError extends Error {readonly message = "unauthorized";}
