// Original file: proto_files/control_plane.proto

import type { GrpcControlPlane_InitialResponseToClient as _aandb_controlplane_GrpcControlPlane_InitialResponseToClient, GrpcControlPlane_InitialResponseToClient__Output as _aandb_controlplane_GrpcControlPlane_InitialResponseToClient__Output } from '../../aandb/controlplane/GrpcControlPlane_InitialResponseToClient';
import type { GrpcControlPlane_CoaAccountList as _aandb_controlplane_GrpcControlPlane_CoaAccountList, GrpcControlPlane_CoaAccountList__Output as _aandb_controlplane_GrpcControlPlane_CoaAccountList__Output } from '../../aandb/controlplane/GrpcControlPlane_CoaAccountList';
import type { GrpcControlPlane_LedgerEndpointDetails as _aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails, GrpcControlPlane_LedgerEndpointDetails__Output as _aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails__Output } from '../../aandb/controlplane/GrpcControlPlane_LedgerEndpointDetails';

export interface GrpcControlPlane_ToClientMsg {
  'initialResponse'?: (_aandb_controlplane_GrpcControlPlane_InitialResponseToClient | null);
  'accountMap'?: (_aandb_controlplane_GrpcControlPlane_CoaAccountList | null);
  'updatedEndpointDetails'?: (_aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails | null);
  'responseType'?: "initialResponse"|"accountMap"|"updatedEndpointDetails";
}

export interface GrpcControlPlane_ToClientMsg__Output {
  'initialResponse'?: (_aandb_controlplane_GrpcControlPlane_InitialResponseToClient__Output);
  'accountMap'?: (_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output);
  'updatedEndpointDetails'?: (_aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails__Output);
}
