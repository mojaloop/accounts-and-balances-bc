// Original file: proto_files/builtin_ledger.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { GrpcBuiltinLedger_AccountList as _aandb_builtinledger_GrpcBuiltinLedger_AccountList, GrpcBuiltinLedger_AccountList__Output as _aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output } from '../../aandb/builtinledger/GrpcBuiltinLedger_AccountList';
import type { GrpcBuiltinLedger_CreateJournalEntryRequestList as _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, GrpcBuiltinLedger_CreateJournalEntryRequestList__Output as _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList__Output } from '../../aandb/builtinledger/GrpcBuiltinLedger_CreateJournalEntryRequestList';
import type { GrpcBuiltinLedger_HighLevelRequestList as _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, GrpcBuiltinLedger_HighLevelRequestList__Output as _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList__Output } from '../../aandb/builtinledger/GrpcBuiltinLedger_HighLevelRequestList';
import type { GrpcBuiltinLedger_HighLevelResponseList as _aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList, GrpcBuiltinLedger_HighLevelResponseList__Output as _aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output } from '../../aandb/builtinledger/GrpcBuiltinLedger_HighLevelResponseList';
import type { GrpcBuiltinLedger_JournalEntryList as _aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList, GrpcBuiltinLedger_JournalEntryList__Output as _aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output } from '../../aandb/builtinledger/GrpcBuiltinLedger_JournalEntryList';
import type { GrpcControlPlane_CreateAccountsRequestList as _aandb_GrpcControlPlane_CreateAccountsRequestList, GrpcControlPlane_CreateAccountsRequestList__Output as _aandb_GrpcControlPlane_CreateAccountsRequestList__Output } from '../../aandb/GrpcControlPlane_CreateAccountsRequestList';
import type { GrpcControlPlane_CreateAccountsResponseList as _aandb_GrpcControlPlane_CreateAccountsResponseList, GrpcControlPlane_CreateAccountsResponseList__Output as _aandb_GrpcControlPlane_CreateAccountsResponseList__Output } from '../../aandb/GrpcControlPlane_CreateAccountsResponseList';
import type { GrpcControlPlane_Id as _aandb_GrpcControlPlane_Id, GrpcControlPlane_Id__Output as _aandb_GrpcControlPlane_Id__Output } from '../../aandb/GrpcControlPlane_Id';
import type { GrpcControlPlane_IdList as _aandb_GrpcControlPlane_IdList, GrpcControlPlane_IdList__Output as _aandb_GrpcControlPlane_IdList__Output } from '../../aandb/GrpcControlPlane_IdList';

export interface GrpcBuiltinLedgerServiceClient extends grpc.Client {
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  
  CreateJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, callback: grpc.requestCallback<_aandb_GrpcControlPlane_IdList__Output>): grpc.ClientUnaryCall;
  
  GetAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>): grpc.ClientUnaryCall;
  
  GetEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  GetEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  GetEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  GetEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  getEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  getEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  getEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  getEntriesByAccountId(argument: _aandb_GrpcControlPlane_Id, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>): grpc.ClientUnaryCall;
  
  ProcessHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  ProcessHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  ProcessHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  ProcessHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, callback: grpc.requestCallback<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>): grpc.ClientUnaryCall;
  
}

export interface GrpcBuiltinLedgerServiceHandlers extends grpc.UntypedServiceImplementation {
  CreateAccounts: grpc.handleUnaryCall<_aandb_GrpcControlPlane_CreateAccountsRequestList__Output, _aandb_GrpcControlPlane_CreateAccountsResponseList>;
  
  CreateJournalEntries: grpc.handleUnaryCall<_aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList__Output, _aandb_GrpcControlPlane_IdList>;
  
  GetAccountsByIds: grpc.handleUnaryCall<_aandb_GrpcControlPlane_IdList__Output, _aandb_builtinledger_GrpcBuiltinLedger_AccountList>;
  
  GetEntriesByAccountId: grpc.handleUnaryCall<_aandb_GrpcControlPlane_Id__Output, _aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList>;
  
  ProcessHighLevelBatch: grpc.handleUnaryCall<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList__Output, _aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList>;
  
}

export interface GrpcBuiltinLedgerServiceDefinition extends grpc.ServiceDefinition {
  CreateAccounts: MethodDefinition<_aandb_GrpcControlPlane_CreateAccountsRequestList, _aandb_GrpcControlPlane_CreateAccountsResponseList, _aandb_GrpcControlPlane_CreateAccountsRequestList__Output, _aandb_GrpcControlPlane_CreateAccountsResponseList__Output>
  CreateJournalEntries: MethodDefinition<_aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList, _aandb_GrpcControlPlane_IdList, _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList__Output, _aandb_GrpcControlPlane_IdList__Output>
  GetAccountsByIds: MethodDefinition<_aandb_GrpcControlPlane_IdList, _aandb_builtinledger_GrpcBuiltinLedger_AccountList, _aandb_GrpcControlPlane_IdList__Output, _aandb_builtinledger_GrpcBuiltinLedger_AccountList__Output>
  GetEntriesByAccountId: MethodDefinition<_aandb_GrpcControlPlane_Id, _aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList, _aandb_GrpcControlPlane_Id__Output, _aandb_builtinledger_GrpcBuiltinLedger_JournalEntryList__Output>
  ProcessHighLevelBatch: MethodDefinition<_aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList, _aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList, _aandb_builtinledger_GrpcBuiltinLedger_HighLevelRequestList__Output, _aandb_builtinledger_GrpcBuiltinLedger_HighLevelResponseList__Output>
}