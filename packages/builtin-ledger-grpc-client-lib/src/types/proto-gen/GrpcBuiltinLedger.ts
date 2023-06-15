// Original file: src/builtin_ledger.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { BuiltinLedgerGrpcAccountArray as _BuiltinLedgerGrpcAccountArray, BuiltinLedgerGrpcAccountArray__Output as _BuiltinLedgerGrpcAccountArray__Output } from './BuiltinLedgerGrpcAccountArray';
import type { BuiltinLedgerGrpcCreateAccountArray as _BuiltinLedgerGrpcCreateAccountArray, BuiltinLedgerGrpcCreateAccountArray__Output as _BuiltinLedgerGrpcCreateAccountArray__Output } from './BuiltinLedgerGrpcCreateAccountArray';
import type { BuiltinLedgerGrpcCreateIdsResponse as _BuiltinLedgerGrpcCreateIdsResponse, BuiltinLedgerGrpcCreateIdsResponse__Output as _BuiltinLedgerGrpcCreateIdsResponse__Output } from './BuiltinLedgerGrpcCreateIdsResponse';
import type { BuiltinLedgerGrpcCreateJournalEntryArray as _BuiltinLedgerGrpcCreateJournalEntryArray, BuiltinLedgerGrpcCreateJournalEntryArray__Output as _BuiltinLedgerGrpcCreateJournalEntryArray__Output } from './BuiltinLedgerGrpcCreateJournalEntryArray';
import type { BuiltinLedgerGrpcHighLevelRequestArray as _BuiltinLedgerGrpcHighLevelRequestArray, BuiltinLedgerGrpcHighLevelRequestArray__Output as _BuiltinLedgerGrpcHighLevelRequestArray__Output } from './BuiltinLedgerGrpcHighLevelRequestArray';
import type { BuiltinLedgerGrpcHighLevelResponseArray as _BuiltinLedgerGrpcHighLevelResponseArray, BuiltinLedgerGrpcHighLevelResponseArray__Output as _BuiltinLedgerGrpcHighLevelResponseArray__Output } from './BuiltinLedgerGrpcHighLevelResponseArray';
import type { BuiltinLedgerGrpcId as _BuiltinLedgerGrpcId, BuiltinLedgerGrpcId__Output as _BuiltinLedgerGrpcId__Output } from './BuiltinLedgerGrpcId';
import type { BuiltinLedgerGrpcIdArray as _BuiltinLedgerGrpcIdArray, BuiltinLedgerGrpcIdArray__Output as _BuiltinLedgerGrpcIdArray__Output } from './BuiltinLedgerGrpcIdArray';
import type { BuiltinLedgerGrpcJournalEntryArray as _BuiltinLedgerGrpcJournalEntryArray, BuiltinLedgerGrpcJournalEntryArray__Output as _BuiltinLedgerGrpcJournalEntryArray__Output } from './BuiltinLedgerGrpcJournalEntryArray';
import type { Empty as _google_protobuf_Empty, Empty__Output as _google_protobuf_Empty__Output } from './google/protobuf/Empty';

export interface GrpcBuiltinLedgerClient extends grpc.Client {
  ActivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  CreateAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcCreateAccountArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcCreateIdsResponse__Output>): grpc.ClientUnaryCall;
  
  CreateJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcCreateJournalEntryArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  
  DeactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  DeleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  GetAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _BuiltinLedgerGrpcIdArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcAccountArray__Output>): grpc.ClientUnaryCall;
  
  GetJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _BuiltinLedgerGrpcId, callback: grpc.requestCallback<_BuiltinLedgerGrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  
  ProcessHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  ProcessHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  ProcessHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  ProcessHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  processHighLevelBatch(argument: _BuiltinLedgerGrpcHighLevelRequestArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcHighLevelResponseArray__Output>): grpc.ClientUnaryCall;
  
}

export interface GrpcBuiltinLedgerHandlers extends grpc.UntypedServiceImplementation {
  ActivateAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty>;
  
  CreateAccounts: grpc.handleUnaryCall<_BuiltinLedgerGrpcCreateAccountArray__Output, _BuiltinLedgerGrpcCreateIdsResponse>;
  
  CreateJournalEntries: grpc.handleUnaryCall<_BuiltinLedgerGrpcCreateJournalEntryArray__Output, _BuiltinLedgerGrpcIdArray>;
  
  DeactivateAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty>;
  
  DeleteAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty>;
  
  GetAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _BuiltinLedgerGrpcAccountArray>;
  
  GetJournalEntriesByAccountId: grpc.handleUnaryCall<_BuiltinLedgerGrpcId__Output, _BuiltinLedgerGrpcJournalEntryArray>;
  
  ProcessHighLevelBatch: grpc.handleUnaryCall<_BuiltinLedgerGrpcHighLevelRequestArray__Output, _BuiltinLedgerGrpcHighLevelResponseArray>;
  
}

export interface GrpcBuiltinLedgerDefinition extends grpc.ServiceDefinition {
  ActivateAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _google_protobuf_Empty, _BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty__Output>
  CreateAccounts: MethodDefinition<_BuiltinLedgerGrpcCreateAccountArray, _BuiltinLedgerGrpcCreateIdsResponse, _BuiltinLedgerGrpcCreateAccountArray__Output, _BuiltinLedgerGrpcCreateIdsResponse__Output>
  CreateJournalEntries: MethodDefinition<_BuiltinLedgerGrpcCreateJournalEntryArray, _BuiltinLedgerGrpcIdArray, _BuiltinLedgerGrpcCreateJournalEntryArray__Output, _BuiltinLedgerGrpcIdArray__Output>
  DeactivateAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _google_protobuf_Empty, _BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty__Output>
  DeleteAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _google_protobuf_Empty, _BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty__Output>
  GetAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _BuiltinLedgerGrpcAccountArray, _BuiltinLedgerGrpcIdArray__Output, _BuiltinLedgerGrpcAccountArray__Output>
  GetJournalEntriesByAccountId: MethodDefinition<_BuiltinLedgerGrpcId, _BuiltinLedgerGrpcJournalEntryArray, _BuiltinLedgerGrpcId__Output, _BuiltinLedgerGrpcJournalEntryArray__Output>
  ProcessHighLevelBatch: MethodDefinition<_BuiltinLedgerGrpcHighLevelRequestArray, _BuiltinLedgerGrpcHighLevelResponseArray, _BuiltinLedgerGrpcHighLevelRequestArray__Output, _BuiltinLedgerGrpcHighLevelResponseArray__Output>
}
