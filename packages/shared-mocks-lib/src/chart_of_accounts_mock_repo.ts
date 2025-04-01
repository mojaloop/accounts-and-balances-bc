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
    CoaAccount,
} from "../../grpc-svc/src/domain/coa_account";
import {
	IChartOfAccountsRepo
} from "../../grpc-svc/src/domain/infrastructure-types/chart_of_accounts_repo";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountAlreadyExistsError, AccountsAndBalancesAccountState} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class ChartOfAccountsMockRepo implements IChartOfAccountsRepo {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	readonly chartOfAccounts: Map<string, CoaAccount>;

	constructor(logger: ILogger) {
		this.logger = logger.createChild(this.constructor.name);

		this.chartOfAccounts = new Map();
	}

	async init(): Promise<void> {
		return;
	}

	async destroy(): Promise<void> {
		return;
	}

    async getAccounts(ids: string[]): Promise<CoaAccount[]>{
        return Array.from(this.chartOfAccounts.values()).filter(value => ids.includes(value.id));
    }

	async accountsExistByInternalIds(ledgerAccountIds: string[]): Promise<boolean> {
		for (const coaAccount of this.chartOfAccounts.values()) {
			for (const ledgerAccountId of ledgerAccountIds) {
				if (coaAccount.ledgerAccountId === ledgerAccountId) {
					return true;
				}
			}
		}
		return false;
	}

	async storeAccounts(coaAccounts: CoaAccount[]): Promise<void> {
		for (const coaAccount of coaAccounts) {
			if (this.chartOfAccounts.has(coaAccount.ledgerAccountId)) {
				throw new AccountAlreadyExistsError();
			}
		}
		for (const coaAccount of coaAccounts) {
			this.chartOfAccounts.set(coaAccount.ledgerAccountId, coaAccount);
		}
	}

	async getAccountsByInternalIds(internalIds: string[]): Promise<CoaAccount[]> {
		const coaAccounts: CoaAccount[] = [];
		for (const coaAccount of this.chartOfAccounts.values()) {
			for (const internalId of internalIds) {
				if (coaAccount.ledgerAccountId === internalId) {
					coaAccounts.push(coaAccount);
				}
			}
		}
		return coaAccounts;
	}

	async getAccountsByOwnerId(ownerId: string): Promise<CoaAccount[]> {
		const coaAccounts: CoaAccount[] = [];
		for (const coaAccount of this.chartOfAccounts.values()) {
			if (coaAccount.ownerId === ownerId) {
				coaAccounts.push(coaAccount);
			}
		}
		return coaAccounts;
	}

	/*async updateAccountStatesByInternalIds(internalIds: string[], accountState: AccountsAndBalancesAccountState): Promise<void> {
		for (const coaAccount of this.chartOfAccounts.values()) {
			for (const internalId of internalIds) {
				if (coaAccount.ledgerAccountId === internalId) {
					coaAccount.state = accountState;
				}
			}
		}
	}*/
}
