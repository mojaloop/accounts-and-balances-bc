// Original file: proto_files/control_plane.proto

import type { GrpcControlPlane_TigerBeetleInfo as _aandb_controlplane_GrpcControlPlane_TigerBeetleInfo, GrpcControlPlane_TigerBeetleInfo__Output as _aandb_controlplane_GrpcControlPlane_TigerBeetleInfo__Output } from '../../aandb/controlplane/GrpcControlPlane_TigerBeetleInfo';
import type { GrpcControlPlane_BuiltinLedgerEndpointList as _aandb_controlplane_GrpcControlPlane_BuiltinLedgerEndpointList, GrpcControlPlane_BuiltinLedgerEndpointList__Output as _aandb_controlplane_GrpcControlPlane_BuiltinLedgerEndpointList__Output } from '../../aandb/controlplane/GrpcControlPlane_BuiltinLedgerEndpointList';

export interface GrpcControlPlane_LedgerEndpointDetails {
  'tigerBeetleInfo'?: (_aandb_controlplane_GrpcControlPlane_TigerBeetleInfo | null);
  'builtinLedgerEndpoints'?: (_aandb_controlplane_GrpcControlPlane_BuiltinLedgerEndpointList | null);
  'ledgerEndpointDetails'?: "tigerBeetleInfo"|"builtinLedgerEndpoints";
}

export interface GrpcControlPlane_LedgerEndpointDetails__Output {
  'tigerBeetleInfo'?: (_aandb_controlplane_GrpcControlPlane_TigerBeetleInfo__Output);
  'builtinLedgerEndpoints'?: (_aandb_controlplane_GrpcControlPlane_BuiltinLedgerEndpointList__Output);
}
