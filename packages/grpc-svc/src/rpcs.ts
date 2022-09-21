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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-client-lib";
import {
	AccountState,
	AccountType,
	Aggregate,
	IAccount,
	IJournalEntry
} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {
	sendUnaryData,
	ServerUnaryCall,
} from "@grpc/grpc-js";
import {GrpcAccount, GrpcAccount__Output} from "./proto/gen/GrpcAccount";
import {GrpcId, GrpcId__Output} from "./proto/gen/GrpcId";
import {GrpcJournalEntryArray, GrpcJournalEntryArray__Output} from "./proto/gen/GrpcJournalEntryArray";
import {GrpcIdArray} from "./proto/gen/GrpcIdArray";
import {GrpcAccountArray} from "./proto/gen/GrpcAccountArray";
import {AccountsAndBalancesGrpcServiceHandlers} from "./proto/gen/AccountsAndBalancesGrpcService";
import {
	domainAccountToGrpcAccount, domainJournalEntryToGrpcJournalEntry,
	grpcAccountToDomainAccount,
	grpcJournalEntryToDomainJournalEntry
} from "./converters";
import {GrpcJournalEntry__Output} from "./proto/gen/GrpcJournalEntry";

export class Handlers {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: Aggregate;
	// Other properties.
	private securityContext: CallSecurityContext = {
		username: "",
		clientId: "",
		rolesIds: [""],
		accessToken: ""
	}

	constructor(
		logger: ILogger,
		aggregate: Aggregate
	) {
		this.logger = logger;
		this.aggregate = aggregate;
	}

	getHandlers(): AccountsAndBalancesGrpcServiceHandlers {
		return {
			"CreateAccount": this.createAccount.bind(this),
			"CreateJournalEntries": this.createJournalEntries.bind(this),
			"GetAccountById": this.getAccountById.bind(this),
			"GetAccountsByExternalId": this.getAccountsByExternalId.bind(this),
			"GetJournalEntriesByAccountId": this.getJournalEntriesByAccountId.bind(this)
		}
	}

	private async createAccount(
		call: ServerUnaryCall<GrpcAccount__Output, GrpcId>,
		callback: sendUnaryData<GrpcId>
	): Promise<void> {
		try {
			const domainAccount: IAccount = grpcAccountToDomainAccount(call.request);
			const accountId: string = await this.aggregate.createAccount(domainAccount, this.securityContext);
			callback(null, {value: accountId});
		} catch (e: unknown) {
		}
	}

	private async createJournalEntries(
		call: ServerUnaryCall<GrpcJournalEntryArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const domainJournalEntries: IJournalEntry[] = [];
		for (const grpcJournalEntry of call.request.value) {
			domainJournalEntries.push(grpcJournalEntryToDomainJournalEntry(grpcJournalEntry))
		}
		try {
			const idsJournalEntries: string[] =
				await this.aggregate.createJournalEntries(domainJournalEntries, this.securityContext);
			const x = idsJournalEntries.map(id => {
				return {value: id};
			});
			callback(null, {value: x});
		} catch (e: unknown) {
			this.logger.debug("");
		}
	}

	private async getAccountById(
		call: ServerUnaryCall<GrpcId__Output, GrpcAccount>,
		callback: sendUnaryData<GrpcAccount>
	): Promise<void> {
		const accountId: string = call.request.value;
		try {
			const domainAccount: IAccount | null = await this.aggregate.getAccountById(accountId, this.securityContext);
			if (!domainAccount) {
				callback(null, {}); // Default account is sent (fields with default values).
			}
			const grpcAccount: GrpcAccount__Output = domainAccountToGrpcAccount(domainAccount!); // TODO: !.
			callback(null, grpcAccount);
		} catch (e: unknown) {
		}
	}

	private async getAccountsByExternalId(
		call: ServerUnaryCall<GrpcId__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const externalId: string = call.request.value;
		try {
			const domainAccounts: IAccount[] =
				await this.aggregate.getAccountsByExternalId(externalId, this.securityContext);
			const grpcAccounts: GrpcAccount__Output[] = []; // TODO: verify.
			for (const domainAccount of domainAccounts) {
				grpcAccounts.push(domainAccountToGrpcAccount(domainAccount));
			}
			callback(null, {value: grpcAccounts});
		} catch (e: unknown) {
		}
	}

	private async getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId__Output, GrpcJournalEntryArray>,
		callback: sendUnaryData<GrpcJournalEntryArray>
	): Promise<void> {
		const accountId: string = call.request.value;
		try {
			const domainJournalEntries: IJournalEntry[] =
				await this.aggregate.getJournalEntriesByAccountId(accountId, this.securityContext);
			const grpcJournalEntries: GrpcJournalEntry__Output[] = [];
			for (const domainJournalEntry of domainJournalEntries) {
				grpcJournalEntries.push(domainJournalEntryToGrpcJournalEntry(domainJournalEntry));
			}
			callback(null, {value: grpcJournalEntries});
		} catch (e: unknown) {
		}
	}
}
