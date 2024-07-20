// Original file: proto_files/control_plane.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Empty as _google_protobuf_Empty, Empty__Output as _google_protobuf_Empty__Output } from '../../google/protobuf/Empty';
import type { GrpcControlPlane_CoaAccountList as _aandb_controlplane_GrpcControlPlane_CoaAccountList, GrpcControlPlane_CoaAccountList__Output as _aandb_controlplane_GrpcControlPlane_CoaAccountList__Output } from '../../aandb/controlplane/GrpcControlPlane_CoaAccountList';
import type { GrpcControlPlane_CreateAccountsRequestList as _aandb_GrpcControlPlane_CreateAccountsRequestList, GrpcControlPlane_CreateAccountsRequestList__Output as _aandb_GrpcControlPlane_CreateAccountsRequestList__Output } from '../../aandb/GrpcControlPlane_CreateAccountsRequestList';
import type { GrpcControlPlane_CreateAccountsResponseList as _aandb_GrpcControlPlane_CreateAccountsResponseList, GrpcControlPlane_CreateAccountsResponseList__Output as _aandb_GrpcControlPlane_CreateAccountsResponseList__Output } from '../../aandb/GrpcControlPlane_CreateAccountsResponseList';
import type { GrpcControlPlane_FromClientMsg as _aandb_controlplane_GrpcControlPlane_FromClientMsg, GrpcControlPlane_FromClientMsg__Output as _aandb_controlplane_GrpcControlPlane_FromClientMsg__Output } from '../../aandb/controlplane/GrpcControlPlane_FromClientMsg';
import type { GrpcControlPlane_FromLedgerMsg as _aandb_controlplane_GrpcControlPlane_FromLedgerMsg, GrpcControlPlane_FromLedgerMsg__Output as _aandb_controlplane_GrpcControlPlane_FromLedgerMsg__Output } from '../../aandb/controlplane/GrpcControlPlane_FromLedgerMsg';
import type { GrpcControlPlane_IdList as _aandb_GrpcControlPlane_IdList, GrpcControlPlane_IdList__Output as _aandb_GrpcControlPlane_IdList__Output } from '../../aandb/GrpcControlPlane_IdList';
import type { GrpcControlPlane_ToClientMsg as _aandb_controlplane_GrpcControlPlane_ToClientMsg, GrpcControlPlane_ToClientMsg__Output as _aandb_controlplane_GrpcControlPlane_ToClientMsg__Output } from '../../aandb/controlplane/GrpcControlPlane_ToClientMsg';
import type { GrpcControlPlane_ToLedgerMsg as _aandb_controlplane_GrpcControlPlane_ToLedgerMsg, GrpcControlPlane_ToLedgerMsg__Output as _aandb_controlplane_GrpcControlPlane_ToLedgerMsg__Output } from '../../aandb/controlplane/GrpcControlPlane_ToLedgerMsg';

export interface GrpcControlPlaneServiceClient extends grpc.Client {
  ActivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  ActivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  activateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  ClientStream(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromClientMsg, _aandb_controlplane_GrpcControlPlane_ToClientMsg__Output>;
  ClientStream(options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromClientMsg, _aandb_controlplane_GrpcControlPlane_ToClientMsg__Output>;
  clientStream(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromClientMsg, _aandb_controlplane_GrpcControlPlane_ToClientMsg__Output>;
  clientStream(options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromClientMsg, _aandb_controlplane_GrpcControlPlane_ToClientMsg__Output>;
  
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  CreateAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  createAccounts(argument: _aandb_GrpcControlPlane_CreateAccountsRequestList, callback: grpc.requestCallback<_aandb_GrpcControlPlane_CreateAccountsResponseList__Output>): grpc.ClientUnaryCall;
  
  DeactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deactivateAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  DeleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  DeleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  deleteAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_google_protobuf_Empty__Output>): grpc.ClientUnaryCall;
  
  GetCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  GetCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  GetCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  GetCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  getCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  getCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, metadata: grpc.Metadata, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  getCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, options: grpc.CallOptions, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  getCoAAccountsByIds(argument: _aandb_GrpcControlPlane_IdList, callback: grpc.requestCallback<_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>): grpc.ClientUnaryCall;
  
  LedgerStream(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromLedgerMsg, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg__Output>;
  LedgerStream(options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromLedgerMsg, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg__Output>;
  ledgerStream(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromLedgerMsg, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg__Output>;
  ledgerStream(options?: grpc.CallOptions): grpc.ClientDuplexStream<_aandb_controlplane_GrpcControlPlane_FromLedgerMsg, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg__Output>;
  
}

export interface GrpcControlPlaneServiceHandlers extends grpc.UntypedServiceImplementation {
  ActivateAccountsByIds: grpc.handleUnaryCall<_aandb_GrpcControlPlane_IdList__Output, _google_protobuf_Empty>;
  
  ClientStream: grpc.handleBidiStreamingCall<_aandb_controlplane_GrpcControlPlane_FromClientMsg__Output, _aandb_controlplane_GrpcControlPlane_ToClientMsg>;
  
  CreateAccounts: grpc.handleUnaryCall<_aandb_GrpcControlPlane_CreateAccountsRequestList__Output, _aandb_GrpcControlPlane_CreateAccountsResponseList>;
  
  DeactivateAccountsByIds: grpc.handleUnaryCall<_aandb_GrpcControlPlane_IdList__Output, _google_protobuf_Empty>;
  
  DeleteAccountsByIds: grpc.handleUnaryCall<_aandb_GrpcControlPlane_IdList__Output, _google_protobuf_Empty>;
  
  GetCoAAccountsByIds: grpc.handleUnaryCall<_aandb_GrpcControlPlane_IdList__Output, _aandb_controlplane_GrpcControlPlane_CoaAccountList>;
  
  LedgerStream: grpc.handleBidiStreamingCall<_aandb_controlplane_GrpcControlPlane_FromLedgerMsg__Output, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg>;
  
}

export interface GrpcControlPlaneServiceDefinition extends grpc.ServiceDefinition {
  ActivateAccountsByIds: MethodDefinition<_aandb_GrpcControlPlane_IdList, _google_protobuf_Empty, _aandb_GrpcControlPlane_IdList__Output, _google_protobuf_Empty__Output>
  ClientStream: MethodDefinition<_aandb_controlplane_GrpcControlPlane_FromClientMsg, _aandb_controlplane_GrpcControlPlane_ToClientMsg, _aandb_controlplane_GrpcControlPlane_FromClientMsg__Output, _aandb_controlplane_GrpcControlPlane_ToClientMsg__Output>
  CreateAccounts: MethodDefinition<_aandb_GrpcControlPlane_CreateAccountsRequestList, _aandb_GrpcControlPlane_CreateAccountsResponseList, _aandb_GrpcControlPlane_CreateAccountsRequestList__Output, _aandb_GrpcControlPlane_CreateAccountsResponseList__Output>
  DeactivateAccountsByIds: MethodDefinition<_aandb_GrpcControlPlane_IdList, _google_protobuf_Empty, _aandb_GrpcControlPlane_IdList__Output, _google_protobuf_Empty__Output>
  DeleteAccountsByIds: MethodDefinition<_aandb_GrpcControlPlane_IdList, _google_protobuf_Empty, _aandb_GrpcControlPlane_IdList__Output, _google_protobuf_Empty__Output>
  GetCoAAccountsByIds: MethodDefinition<_aandb_GrpcControlPlane_IdList, _aandb_controlplane_GrpcControlPlane_CoaAccountList, _aandb_GrpcControlPlane_IdList__Output, _aandb_controlplane_GrpcControlPlane_CoaAccountList__Output>
  LedgerStream: MethodDefinition<_aandb_controlplane_GrpcControlPlane_FromLedgerMsg, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg, _aandb_controlplane_GrpcControlPlane_FromLedgerMsg__Output, _aandb_controlplane_GrpcControlPlane_ToLedgerMsg__Output>
}
