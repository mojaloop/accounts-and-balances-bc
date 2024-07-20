import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { GrpcControlPlaneServiceClient as _aandb_controlplane_GrpcControlPlaneServiceClient, GrpcControlPlaneServiceDefinition as _aandb_controlplane_GrpcControlPlaneServiceDefinition } from './aandb/controlplane/GrpcControlPlaneService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  aandb: {
    GrpcControlPlane_CreateAccountsRequestList: MessageTypeDefinition
    GrpcControlPlane_CreateAccountsResponse: MessageTypeDefinition
    GrpcControlPlane_CreateAccountsResponseList: MessageTypeDefinition
    GrpcControlPlane_Currency: MessageTypeDefinition
    GrpcControlPlane_Id: MessageTypeDefinition
    GrpcControlPlane_IdList: MessageTypeDefinition
    controlplane: {
      GrpcControlPlaneService: SubtypeConstructor<typeof grpc.Client, _aandb_controlplane_GrpcControlPlaneServiceClient> & { service: _aandb_controlplane_GrpcControlPlaneServiceDefinition }
      GrpcControlPlane_BuiltinLedgerEndpoint: MessageTypeDefinition
      GrpcControlPlane_BuiltinLedgerEndpointList: MessageTypeDefinition
      GrpcControlPlane_ClientInitialRequest: MessageTypeDefinition
      GrpcControlPlane_CoaAccount: MessageTypeDefinition
      GrpcControlPlane_CoaAccountList: MessageTypeDefinition
      GrpcControlPlane_CoaCurrency: MessageTypeDefinition
      GrpcControlPlane_CoaCurrencyList: MessageTypeDefinition
      GrpcControlPlane_FromClientMsg: MessageTypeDefinition
      GrpcControlPlane_FromLedgerMsg: MessageTypeDefinition
      GrpcControlPlane_InitialResponseToClient: MessageTypeDefinition
      GrpcControlPlane_LedgerEndpointDetails: MessageTypeDefinition
      GrpcControlPlane_LedgerInitialMsg: MessageTypeDefinition
      GrpcControlPlane_LedgerServiceType: EnumTypeDefinition
      GrpcControlPlane_TigerBeetleInfo: MessageTypeDefinition
      GrpcControlPlane_ToClientMsg: MessageTypeDefinition
      GrpcControlPlane_ToLedgerMsg: MessageTypeDefinition
    }
  }
  google: {
    protobuf: {
      Empty: MessageTypeDefinition
    }
  }
}

