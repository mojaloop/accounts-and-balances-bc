// Original file: src/accounts_and_balances.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Empty as _google_protobuf_Empty, Empty__Output as _google_protobuf_Empty__Output } from './google/protobuf/Empty';
import type { GrpcAccountArray as _GrpcAccountArray, GrpcAccountArray__Output as _GrpcAccountArray__Output } from './GrpcAccountArray';
import type { GrpcCancelReservationAndCommitRequest as _GrpcCancelReservationAndCommitRequest, GrpcCancelReservationAndCommitRequest__Output as _GrpcCancelReservationAndCommitRequest__Output } from './GrpcCancelReservationAndCommitRequest';
import type { GrpcCancelReservationRequest as _GrpcCancelReservationRequest, GrpcCancelReservationRequest__Output as _GrpcCancelReservationRequest__Output } from './GrpcCancelReservationRequest';
import type { GrpcCheckLiquidAndReserveRequest as _GrpcCheckLiquidAndReserveRequest, GrpcCheckLiquidAndReserveRequest__Output as _GrpcCheckLiquidAndReserveRequest__Output } from './GrpcCheckLiquidAndReserveRequest';
import type { GrpcCreateAccountArray as _GrpcCreateAccountArray, GrpcCreateAccountArray__Output as _GrpcCreateAccountArray__Output } from './GrpcCreateAccountArray';
import type { GrpcCreateJournalEntryArray as _GrpcCreateJournalEntryArray, GrpcCreateJournalEntryArray__Output as _GrpcCreateJournalEntryArray__Output } from './GrpcCreateJournalEntryArray';
import type { GrpcId as _GrpcId, GrpcId__Output as _GrpcId__Output } from './GrpcId';
import type { GrpcIdArray as _GrpcIdArray, GrpcIdArray__Output as _GrpcIdArray__Output } from './GrpcIdArray';
import type { GrpcJournalEntryArray as _GrpcJournalEntryArray, GrpcJournalEntryArray__Output as _GrpcJournalEntryArray__Output } from './GrpcJournalEntryArray';

export interface GrpcAccountsAndBalancesClient extends grpc.Client {
  ActivateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  CancelReservation(argument: _GrpcCancelReservationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CancelReservation(argument: _GrpcCancelReservationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CancelReservation(argument: _GrpcCancelReservationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CancelReservation(argument: _GrpcCancelReservationRequest, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservation(argument: _GrpcCancelReservationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservation(argument: _GrpcCancelReservationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservation(argument: _GrpcCancelReservationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservation(argument: _GrpcCancelReservationRequest, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  CancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  cancelReservationAndCommit(argument: _GrpcCancelReservationAndCommitRequest, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  CheckLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CheckLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CheckLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  CheckLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  checkLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  checkLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  checkLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  checkLiquidAndReserve(argument: _GrpcCheckLiquidAndReserveRequest, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  CreateAccounts(argument: _GrpcCreateAccountArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _GrpcCreateAccountArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _GrpcCreateAccountArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _GrpcCreateAccountArray, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _GrpcCreateAccountArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _GrpcCreateAccountArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _GrpcCreateAccountArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _GrpcCreateAccountArray, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  
  CreateJournalEntries(argument: _GrpcCreateJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _GrpcCreateJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _GrpcCreateJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  CreateJournalEntries(argument: _GrpcCreateJournalEntryArray, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcCreateJournalEntryArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcCreateJournalEntryArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcCreateJournalEntryArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  createJournalEntries(argument: _GrpcCreateJournalEntryArray, callback: grpc.requestCallback<_GrpcIdArray__Output>): grpc.ClientUnaryCall;
  
  DeactivateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  DeleteAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  GetAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _GrpcIdArray, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _GrpcIdArray, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByIds(argument: _GrpcIdArray, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  
  GetAccountsByOwnerId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByOwnerId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByOwnerId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  GetAccountsByOwnerId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByOwnerId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByOwnerId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByOwnerId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  getAccountsByOwnerId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcAccountArray__Output>): grpc.ClientUnaryCall;
  
  GetJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  GetJournalEntriesByAccountId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, metadata: grpc.Metadata, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, options: grpc.CallOptions, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  getJournalEntriesByAccountId(argument: _GrpcId, callback: grpc.requestCallback<_GrpcJournalEntryArray__Output>): grpc.ClientUnaryCall;
  
}

export interface GrpcAccountsAndBalancesHandlers extends grpc.UntypedServiceImplementation {
  ActivateAccountsByIds: grpc.handleUnaryCall<_GrpcIdArray__Output, _google_protobuf_Empty>;
  
  CancelReservation: grpc.handleUnaryCall<_GrpcCancelReservationRequest__Output, _google_protobuf_Empty>;
  
  CancelReservationAndCommit: grpc.handleUnaryCall<_GrpcCancelReservationAndCommitRequest__Output, _google_protobuf_Empty>;
  
  CheckLiquidAndReserve: grpc.handleUnaryCall<_GrpcCheckLiquidAndReserveRequest__Output, _google_protobuf_Empty>;
  
  CreateAccounts: grpc.handleUnaryCall<_GrpcCreateAccountArray__Output, _GrpcIdArray>;
  
  CreateJournalEntries: grpc.handleUnaryCall<_GrpcCreateJournalEntryArray__Output, _GrpcIdArray>;
  
  DeactivateAccountsByIds: grpc.handleUnaryCall<_GrpcIdArray__Output, _google_protobuf_Empty>;
  
  DeleteAccountsByIds: grpc.handleUnaryCall<_GrpcIdArray__Output, _google_protobuf_Empty>;
  
  GetAccountsByIds: grpc.handleUnaryCall<_GrpcIdArray__Output, _GrpcAccountArray>;
  
  GetAccountsByOwnerId: grpc.handleUnaryCall<_GrpcId__Output, _GrpcAccountArray>;
  
  GetJournalEntriesByAccountId: grpc.handleUnaryCall<_GrpcId__Output, _GrpcJournalEntryArray>;
  
}

export interface GrpcAccountsAndBalancesDefinition extends grpc.ServiceDefinition {
  ActivateAccountsByIds: MethodDefinition<_GrpcIdArray, _google_protobuf_Empty, _GrpcIdArray__Output, _google_protobuf_Empty__Output>
  CancelReservation: MethodDefinition<_GrpcCancelReservationRequest, _google_protobuf_Empty, _GrpcCancelReservationRequest__Output, _google_protobuf_Empty__Output>
  CancelReservationAndCommit: MethodDefinition<_GrpcCancelReservationAndCommitRequest, _google_protobuf_Empty, _GrpcCancelReservationAndCommitRequest__Output, _google_protobuf_Empty__Output>
  CheckLiquidAndReserve: MethodDefinition<_GrpcCheckLiquidAndReserveRequest, _google_protobuf_Empty, _GrpcCheckLiquidAndReserveRequest__Output, _google_protobuf_Empty__Output>
  CreateAccounts: MethodDefinition<_GrpcCreateAccountArray, _GrpcIdArray, _GrpcCreateAccountArray__Output, _GrpcIdArray__Output>
  CreateJournalEntries: MethodDefinition<_GrpcCreateJournalEntryArray, _GrpcIdArray, _GrpcCreateJournalEntryArray__Output, _GrpcIdArray__Output>
  DeactivateAccountsByIds: MethodDefinition<_GrpcIdArray, _google_protobuf_Empty, _GrpcIdArray__Output, _google_protobuf_Empty__Output>
  DeleteAccountsByIds: MethodDefinition<_GrpcIdArray, _google_protobuf_Empty, _GrpcIdArray__Output, _google_protobuf_Empty__Output>
  GetAccountsByIds: MethodDefinition<_GrpcIdArray, _GrpcAccountArray, _GrpcIdArray__Output, _GrpcAccountArray__Output>
  GetAccountsByOwnerId: MethodDefinition<_GrpcId, _GrpcAccountArray, _GrpcId__Output, _GrpcAccountArray__Output>
  GetJournalEntriesByAccountId: MethodDefinition<_GrpcId, _GrpcJournalEntryArray, _GrpcId__Output, _GrpcJournalEntryArray__Output>
}
