// Original file: src/accounts_and_balances.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { GrpcAccount as _GrpcAccount, GrpcAccount__Output as _GrpcAccount__Output } from 'packages/grpc-client-lib/src/types/GrpcAccount';
import type { GrpcGetAccountByIdResponse as _GrpcGetAccountByIdResponse, GrpcGetAccountByIdResponse__Output as _GrpcGetAccountByIdResponse__Output } from 'packages/grpc-client-lib/src/types/GrpcGetAccountByIdResponse';
import type { GrpcGetAccountsByExternalIdResponse as _GrpcGetAccountsByExternalIdResponse, GrpcGetAccountsByExternalIdResponse__Output as _GrpcGetAccountsByExternalIdResponse__Output } from 'packages/grpc-client-lib/src/types/GrpcGetAccountsByExternalIdResponse';
import type { GrpcGetJournalEntriesByAccountIdResponse as _GrpcGetJournalEntriesByAccountIdResponse, GrpcGetJournalEntriesByAccountIdResponse__Output as _GrpcGetJournalEntriesByAccountIdResponse__Output } from 'packages/grpc-client-lib/src/types/GrpcGetJournalEntriesByAccountIdResponse';
import type { GrpcId as _GrpcId, GrpcId__Output as _GrpcId__Output } from 'packages/grpc-client-lib/src/types/GrpcId';
import type { GrpcIdArray as _GrpcIdArray, GrpcIdArray__Output as _GrpcIdArray__Output } from 'packages/grpc-client-lib/src/types/GrpcIdArray';
import type { GrpcJournalEntryArray as _GrpcJournalEntryArray, GrpcJournalEntryArray__Output as _GrpcJournalEntryArray__Output } from 'packages/grpc-client-lib/src/types/GrpcJournalEntryArray';

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
  
  GetAccountById(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  GetAccountById(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  GetAccountById(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  GetAccountById(argument: _GrpcId, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountById(argument: _GrpcId, callback: grpc.requestCallback<_GrpcGetAccountByIdResponse__Output>): grpc.ClientUnaryCall;
  
  GetAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  GetAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  GetAccountsByExternalId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  GetAccountsByExternalId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  getAccountsByExternalId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcGetAccountsByExternalIdResponse__Output>): grpc.ClientUnaryCall;
  
  GetJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcGetJournalEntriesByAccountIdResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface AccountsAndBalancesGrpcServiceHandlers extends grpc.UntypedServiceImplementation {
  CreateAccount: grpc.handleUnaryCall<_GrpcAccount__Output, _GrpcId>;
  
  CreateJournalEntries: grpc.handleUnaryCall<_GrpcJournalEntryArray__Output, _GrpcIdArray>;
  
  GetAccountById: grpc.handleUnaryCall<_GrpcId__Output, _GrpcGetAccountByIdResponse>;
  
  GetAccountsByExternalId: grpc.handleUnaryCall<_GrpcId__Output, _GrpcGetAccountsByExternalIdResponse>;
  
  GetJournalEntriesByAccountId: grpc.handleUnaryCall<_GrpcId__Output, _GrpcGetJournalEntriesByAccountIdResponse>;
  
}

export interface AccountsAndBalancesGrpcServiceDefinition extends grpc.ServiceDefinition {
  CreateAccount: MethodDefinition<_GrpcAccount, _GrpcId, _GrpcAccount__Output, _GrpcId__Output>
  CreateJournalEntries: MethodDefinition<_GrpcJournalEntryArray, _GrpcIdArray, _GrpcJournalEntryArray__Output, _GrpcIdArray__Output>
  GetAccountById: MethodDefinition<_GrpcId, _GrpcGetAccountByIdResponse, _GrpcId__Output, _GrpcGetAccountByIdResponse__Output>
  GetAccountsByExternalId: MethodDefinition<_GrpcId, _GrpcGetAccountsByExternalIdResponse, _GrpcId__Output, _GrpcGetAccountsByExternalIdResponse__Output>
  GetJournalEntriesByAccountId: MethodDefinition<_GrpcId, _GrpcGetJournalEntriesByAccountIdResponse, _GrpcId__Output, _GrpcGetJournalEntriesByAccountIdResponse__Output>
}
