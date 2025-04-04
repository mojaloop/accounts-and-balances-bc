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

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

import {
	BuiltinLedgerAccount,
	IBuiltinLedgerAccountsRepo
} from "../../builtin-ledger-grpc-svc/src/domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountsAndBalancesAccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class BuiltinLedgerAccountsMockRepo implements IBuiltinLedgerAccountsRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly builtinLedgerAccounts: Map<string, BuiltinLedgerAccount>;

	constructor(logger: ILogger) {
		this.logger = logger.createChild(this.constructor.name);

		this.builtinLedgerAccounts = new Map();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

	async storeNewAccount(builtinLedgerAccount: BuiltinLedgerAccount): Promise<void> {
		if (this.builtinLedgerAccounts.has(builtinLedgerAccount.id)) {
			throw new Error();
		}
		this.builtinLedgerAccounts.set(builtinLedgerAccount.id, builtinLedgerAccount);
	}

    async updateAccounts(accounts: BuiltinLedgerAccount[]): Promise<void>{
        accounts.forEach(value => {
            this.builtinLedgerAccounts.set(value.id, value);
        });
    }

	async getAccountsByIds(accountIds: string[]): Promise<BuiltinLedgerAccount[]> {
		const builtinLedgerAccounts: BuiltinLedgerAccount[] = [];
		for (const builtinLedgerAccount of this.builtinLedgerAccounts.values()) {
			for (const accountId of accountIds) {
				if (builtinLedgerAccount.id === accountId) {
					builtinLedgerAccounts.push(builtinLedgerAccount);
				}
			}
		}
		return builtinLedgerAccounts;
	}

	async updateAccountDebitBalanceAndTimestamp(
		accountId: string,
        newBalance: bigint,
        pending: boolean,
		timestampLastJournalEntry: number
	): Promise<void> {
		const builtinLedgerAccount: BuiltinLedgerAccount | undefined = this.builtinLedgerAccounts.get(accountId);
		if (!builtinLedgerAccount) {
			throw new Error();
		}
        if(pending)
            builtinLedgerAccount.pendingDebitBalance = newBalance;
        else
            builtinLedgerAccount.postedDebitBalance = newBalance;

		builtinLedgerAccount.timestampLastJournalEntry = timestampLastJournalEntry;
	}

	async updateAccountCreditBalanceAndTimestamp(
		accountId: string,
        newBalance: bigint,
        pending: boolean,
		timestampLastJournalEntry: number
	): Promise<void> {
		const builtinLedgerAccount: BuiltinLedgerAccount | undefined = this.builtinLedgerAccounts.get(accountId);
		if (!builtinLedgerAccount) {
			throw new Error();
		}

        if(pending)
            builtinLedgerAccount.pendingCreditBalance = newBalance;
        else
            builtinLedgerAccount.postedCreditBalance = newBalance;

		builtinLedgerAccount.timestampLastJournalEntry = timestampLastJournalEntry;
	}

	async updateAccountStatesByIds(accountIds: string[], accountState: AccountsAndBalancesAccountState): Promise<void> {
		for (const builtinLedgerAccount of this.builtinLedgerAccounts.values()) {
			for (const accountId of accountIds) {
				if (builtinLedgerAccount.id === accountId) {
					builtinLedgerAccount.state = accountState;
				}
			}
		}
	}
}
