import {AccountState, AccountType, IAccount, IJournalEntry} from "@mojaloop/accounts-and-balances-bc-domain-lib";
import {GrpcAccount__Output} from "./proto/gen/GrpcAccount";
import {GrpcJournalEntry__Output} from "./proto/gen/GrpcJournalEntry";

export function grpcAccountToDomainAccount(grpcAccount: GrpcAccount__Output): IAccount {
	const timestampLastJournalEntry: bigint = BigInt(grpcAccount.timestampLastJournalEntry);
	if (timestampLastJournalEntry > Number.MAX_SAFE_INTEGER) {
		throw new Error(); // TODO: create type.
	}
	return {
		id: grpcAccount.id,
		externalId: grpcAccount.externalId,
		state: grpcAccount.state as AccountState,
		type: grpcAccount.type as AccountType,
		currency: grpcAccount.currency,
		creditBalance: BigInt(grpcAccount.creditBalance),
		debitBalance: BigInt(grpcAccount.debitBalance),
		timestampLastJournalEntry: parseInt(grpcAccount.timestampLastJournalEntry)
	}
}

export function domainAccountToGrpcAccount(domainAccount: IAccount): GrpcAccount__Output {
	return {
		id: domainAccount.id,
		externalId: domainAccount.externalId || "",
		state: domainAccount.state,
		type: domainAccount.type,
		currency: domainAccount.currency,
		creditBalance: domainAccount.creditBalance.toString(),
		debitBalance: domainAccount.debitBalance.toString(),
		timestampLastJournalEntry: domainAccount.timestampLastJournalEntry.toString()
	}
}

export function grpcJournalEntryToDomainJournalEntry(grpcJournalEntry: GrpcJournalEntry__Output): IJournalEntry {
	const timestamp: bigint = BigInt(grpcJournalEntry.timestamp);
	if (timestamp > Number.MAX_SAFE_INTEGER) {
		throw new Error(); // TODO: create type.
	}
	return {
		id: grpcJournalEntry.id,
		externalId: grpcJournalEntry.externalId,
		externalCategory: grpcJournalEntry.externalCategory,
		currency: grpcJournalEntry.currency,
		amount: BigInt(grpcJournalEntry.amount),
		creditedAccountId: grpcJournalEntry.creditedAccountId,
		debitedAccountId: grpcJournalEntry.debitedAccountId,
		timestamp: parseInt(grpcJournalEntry.timestamp)
	}
}

export function domainJournalEntryToGrpcJournalEntry(domainJournalEntry: IJournalEntry): GrpcJournalEntry__Output {
	return {
		id: domainJournalEntry.id,
		externalId: domainJournalEntry.externalId || "",
		externalCategory: domainJournalEntry.externalId || "",
		currency: domainJournalEntry.currency,
		amount: domainJournalEntry.amount.toString(),
		creditedAccountId: domainJournalEntry.creditedAccountId.toString(),
		debitedAccountId: domainJournalEntry.debitedAccountId.toString(),
		timestamp: domainJournalEntry.timestamp.toString()
	}
}
