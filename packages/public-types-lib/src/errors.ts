/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>
- Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use strict";

/**
 * Main error class of all Accounts and Balances errors
 */
export class AccountsAndBalancesError extends Error{}

// used
export class InvalidAccountParametersError extends AccountsAndBalancesError{}
export class InvalidJournalEntryParametersError extends AccountsAndBalancesError{}
export class CurrencyCodeNotFoundError extends AccountsAndBalancesError {}
export class AccountNotFoundError extends AccountsAndBalancesError {}
export class AccountAlreadyExistsError extends AccountsAndBalancesError {}

// high level errors
export class PayerFailedLiquidityCheckError extends AccountsAndBalancesError {}

//
// /// not used
// export class UnableToCreateAccountsError extends AccountsAndBalancesError {}
// export class UnableToCreateJournalEntriesError extends AccountsAndBalancesError {}
// export class UnableToGetAccountsError extends AccountsAndBalancesError {}
// export class UnableToGetJournalEntriesError extends AccountsAndBalancesError {}
// export class UnableToDeleteAccountsError extends AccountsAndBalancesError {}
// export class UnableToDeactivateAccountsError extends AccountsAndBalancesError {}
// export class AccountAlreadyExistsError extends AccountsAndBalancesError {}
// export class SameDebitedAndCreditedAccountsError extends AccountsAndBalancesError {}
// export class CurrencyCodesDifferError extends AccountsAndBalancesError {}
// export class InvalidJournalEntryAmountError extends AccountsAndBalancesError {}
// export class JournalEntryAlreadyExistsError extends AccountsAndBalancesError {}
// export class CreditedAccountNotFoundError extends AccountsAndBalancesError {}
// export class DebitedAccountNotFoundError extends AccountsAndBalancesError {}
//
//
//



