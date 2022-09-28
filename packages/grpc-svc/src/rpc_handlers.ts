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
import {Aggregate} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {
	GrpcAccount,
	GrpcAccount__Output,
	GrpcId,
	GrpcId__Output,
	GrpcJournalEntryArray,
	GrpcJournalEntryArray__Output,
	GrpcIdArray,
	GrpcAccountArray,
	GrpcJournalEntry__Output,
	AccountsAndBalancesGrpcServiceHandlers,
	grpcAccountToAccountDto,
	grpcJournalEntryToJournalEntryDto,
	accountDtoToGrpcAccount,
	journalEntryDtoToGrpcJournalEntry
} from "@mojaloop/accounts-and-balances-bc-grpc-common-lib";
import {
	sendUnaryData,
	ServerUnaryCall,
} from "@grpc/grpc-js";
import {IAccountDto, IJournalEntryDto} from "@mojaloop/accounts-and-balances-bc-public-types-lib";

export class RpcHandlers {
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

	// TODO: error handling; verify types.

	private async createAccount(
		call: ServerUnaryCall<GrpcAccount__Output, GrpcId>,
		callback: sendUnaryData<GrpcId>
	): Promise<void> {
		try {
			const accountDto: IAccountDto = grpcAccountToAccountDto(call.request);
			const accountId: string = await this.aggregate.createAccount(accountDto, this.securityContext);
			const grpcAccountId: GrpcId = {grpcId: accountId};
			callback(null, grpcAccountId);
		} catch (error: unknown) {
			if (error instanceof Error) {
				callback(error, null);
				return;
			}
			this.logger.error(error);
		}
	}

	private async createJournalEntries(
		call: ServerUnaryCall<GrpcJournalEntryArray__Output, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const journalEntryDtos: IJournalEntryDto[] = call.request.grpcJournalEntryArray.map(grpcJournalEntry => {
			return grpcJournalEntryToJournalEntryDto(grpcJournalEntry);
		});
		try {
			const idsJournalEntries: string[] =
				await this.aggregate.createJournalEntries(journalEntryDtos, this.securityContext);
			const grpcIdsJournalEntries: GrpcId[] = idsJournalEntries.map(id => {
				return {grpcId: id};
			});
			callback(null, {grpcIdArray: grpcIdsJournalEntries});
		} catch (error: unknown) {
			if (error instanceof Error) {
				callback(error, null);
				return;
			}
			this.logger.error(error);
		}
	}

	private async getAccountById(
		call: ServerUnaryCall<GrpcId__Output, GrpcAccount>,
		callback: sendUnaryData<GrpcAccount>
	): Promise<void> {
		const accountId: string = call.request.grpcId;
		try {
			const accountDto: IAccountDto | null = await this.aggregate.getAccountById(accountId, this.securityContext);
			if (accountDto === null) {
				callback(null, {}); // Default gRPC account is sent (fields with default values).
				return;
			}
			const grpcAccount: GrpcAccount = accountDtoToGrpcAccount(accountDto);
			callback(null, grpcAccount);
		} catch (error: unknown) {
			if (error instanceof Error) {
				callback(error, null);
				return;
			}
			this.logger.error(error);
		}
	}

	private async getAccountsByExternalId(
		call: ServerUnaryCall<GrpcId__Output, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const externalId: string = call.request.grpcId;
		try {
			const accountDtos: IAccountDto[] =
				await this.aggregate.getAccountsByExternalId(externalId, this.securityContext);
			const grpcAccounts: GrpcAccount__Output[] = accountDtos.map(accountDto => {
				return accountDtoToGrpcAccount(accountDto);
			});
			callback(null, {grpcAccountArray: grpcAccounts});
		} catch (error: unknown) {
			if (error instanceof Error) {
				callback(error, null);
				return;
			}
			this.logger.error(error);
		}
	}

	private async getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId__Output, GrpcJournalEntryArray>,
		callback: sendUnaryData<GrpcJournalEntryArray>
	): Promise<void> {
		const accountId: string = call.request.grpcId;
		try {
			const journalEntryDtos: IJournalEntryDto[] =
				await this.aggregate.getJournalEntriesByAccountId(accountId, this.securityContext);
			const grpcJournalEntries: GrpcJournalEntry__Output[] = journalEntryDtos.map(journalEntryDto => {
				return journalEntryDtoToGrpcJournalEntry(journalEntryDto);
			});
			callback(null, {grpcJournalEntryArray: grpcJournalEntries});
		} catch (error: unknown) {
			if (error instanceof Error) {
				callback(error, null);
				return;
			}
			this.logger.error(error);
		}
	}
}
