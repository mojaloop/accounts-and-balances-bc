// Original file: src/builtin_ledger.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { BuiltinLedgerGrpcAccountArray as _BuiltinLedgerGrpcAccountArray, BuiltinLedgerGrpcAccountArray__Output as _BuiltinLedgerGrpcAccountArray__Output } from './BuiltinLedgerGrpcAccountArray';
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
  
  CreateAccounts(argument: _BuiltinLedgerGrpcAccountArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _BuiltinLedgerGrpcAccountArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _BuiltinLedgerGrpcAccountArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _BuiltinLedgerGrpcAccountArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcAccountArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcAccountArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcAccountArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _BuiltinLedgerGrpcAccountArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  
  CreateJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _BuiltinLedgerGrpcJournalEntryArray, callback: grpc.requestCallback<_BuiltinLedgerGrpcIdArray__Output>): grpc.ClientUnaryCall;
  
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
  
}

export interface GrpcBuiltinLedgerHandlers extends grpc.UntypedServiceImplementation {
  ActivateAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty>;
  
  CreateAccounts: grpc.handleUnaryCall<_BuiltinLedgerGrpcAccountArray__Output, _BuiltinLedgerGrpcIdArray>;
  
  CreateJournalEntries: grpc.handleUnaryCall<_BuiltinLedgerGrpcJournalEntryArray__Output, _BuiltinLedgerGrpcIdArray>;
  
  DeactivateAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty>;
  
  DeleteAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty>;
  
  GetAccountsByIds: grpc.handleUnaryCall<_BuiltinLedgerGrpcIdArray__Output, _BuiltinLedgerGrpcAccountArray>;
  
  GetJournalEntriesByAccountId: grpc.handleUnaryCall<_BuiltinLedgerGrpcId__Output, _BuiltinLedgerGrpcJournalEntryArray>;
  
}

export interface GrpcBuiltinLedgerDefinition extends grpc.ServiceDefinition {
  ActivateAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _google_protobuf_Empty, _BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty__Output>
  CreateAccounts: MethodDefinition<_BuiltinLedgerGrpcAccountArray, _BuiltinLedgerGrpcIdArray, _BuiltinLedgerGrpcAccountArray__Output, _BuiltinLedgerGrpcIdArray__Output>
  CreateJournalEntries: MethodDefinition<_BuiltinLedgerGrpcJournalEntryArray, _BuiltinLedgerGrpcIdArray, _BuiltinLedgerGrpcJournalEntryArray__Output, _BuiltinLedgerGrpcIdArray__Output>
  DeactivateAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _google_protobuf_Empty, _BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty__Output>
  DeleteAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _google_protobuf_Empty, _BuiltinLedgerGrpcIdArray__Output, _google_protobuf_Empty__Output>
  GetAccountsByIds: MethodDefinition<_BuiltinLedgerGrpcIdArray, _BuiltinLedgerGrpcAccountArray, _BuiltinLedgerGrpcIdArray__Output, _BuiltinLedgerGrpcAccountArray__Output>
  GetJournalEntriesByAccountId: MethodDefinition<_BuiltinLedgerGrpcId, _BuiltinLedgerGrpcJournalEntryArray, _BuiltinLedgerGrpcId__Output, _BuiltinLedgerGrpcJournalEntryArray__Output>
}
