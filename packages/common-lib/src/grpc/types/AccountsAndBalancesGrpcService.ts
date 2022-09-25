// Original file: src/grpc/accounts_and_balances.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { GrpcAccount as _GrpcAccount, GrpcAccount__Output as _GrpcAccount__Output } from './GrpcAccount';
import type { GrpcAccountArray as _GrpcAccountArray, GrpcAccountArray__Output as _GrpcAccountArray__Output } from './GrpcAccountArray';
import type { GrpcId as _GrpcId, GrpcId__Output as _GrpcId__Output } from './GrpcId';
import type { GrpcIdArray as _GrpcIdArray, GrpcIdArray__Output as _GrpcIdArray__Output } from './GrpcIdArray';
import type { GrpcJournalEntryArray as _GrpcJournalEntryArray, GrpcJournalEntryArray__Output as _GrpcJournalEntryArray__Output } from './GrpcJournalEntryArray';

export interface AccountsAndBalancesGrpcServiceClient extends grpc.Client {
  CreateAccount(argument: _GrpcAccount, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  CreateAccount(argument: _GrpcAccount, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  CreateAccount(argument: _GrpcAccount, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  CreateAccount(argument: _GrpcAccount, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  createAccount(argument: _GrpcAccount, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  createAccount(argument: _GrpcAccount, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  createAccount(argument: _GrpcAccount, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  createAccount(argument: _GrpcAccount, callback: grpc.requestCallback<_GrpcId__Output>): grpc.ClientUnaryCall;
  
  CreateJournalEntries(argument: _GrpcJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _GrpcJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _GrpcJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _GrpcJournalEntryArray, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcJournalEntryArray, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  
  GetAccountById(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  GetAccountById(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  GetAccountById(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  GetAccountById(argument: _GrpcId, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, callback: grpc.requestCallback<_GrpcAccount__Output>): grpc.ClientUnaryCall;
  
  GetAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByExternalId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByExternalId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  
  GetJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  
}

export interface AccountsAndBalancesGrpcServiceHandlers extends grpc.UntypedServiceImplementation {
  CreateAccount: grpc.handleUnaryCall<_GrpcAccount__Output, _GrpcId>;
  
  CreateJournalEntries: grpc.handleUnaryCall<_GrpcJournalEntryArray__Output, _GrpcIdArray>;
  
  GetAccountById: grpc.handleUnaryCall<_GrpcId__Output, _GrpcAccount>;
  
  GetAccountsByExternalId: grpc.handleUnaryCall<_GrpcId__Output, _GrpcAccountArray>;
  
  GetJournalEntriesByAccountId: grpc.handleUnaryCall<_GrpcId__Output, _GrpcJournalEntryArray>;
  
}

export interface AccountsAndBalancesGrpcServiceDefinition extends grpc.ServiceDefinition {
  CreateAccount: MethodDefinition<_GrpcAccount, _GrpcId, _GrpcAccount__Output, _GrpcId__Output>
  CreateJournalEntries: MethodDefinition<_GrpcJournalEntryArray, _GrpcIdArray, _GrpcJournalEntryArray__Output, _GrpcIdArray__Output>
  GetAccountById: MethodDefinition<_GrpcId, _GrpcAccount, _GrpcId__Output, _GrpcAccount__Output>
  GetAccountsByExternalId: MethodDefinition<_GrpcId, _GrpcAccountArray, _GrpcId__Output, _GrpcAccountArray__Output>
  GetJournalEntriesByAccountId: MethodDefinition<_GrpcId, _GrpcJournalEntryArray, _GrpcId__Output, _GrpcJournalEntryArray__Output>
}
