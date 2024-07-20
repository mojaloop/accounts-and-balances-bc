// Original file: proto_files/control_plane.proto

import type { GrpcControlPlane_LedgerServiceType as _aandb_controlplane_GrpcControlPlane_LedgerServiceType, GrpcControlPlane_LedgerServiceType__Output as _aandb_controlplane_GrpcControlPlane_LedgerServiceType__Output } from '../../aandb/controlplane/GrpcControlPlane_LedgerServiceType';

export interface GrpcControlPlane_LedgerInitialMsg {
  'ledgerType'?: (_aandb_controlplane_GrpcControlPlane_LedgerServiceType);
  'instanceId'?: (string);
  'address'?: (string);
}

export interface GrpcControlPlane_LedgerInitialMsg__Output {
  'ledgerType'?: (_aandb_controlplane_GrpcControlPlane_LedgerServiceType__Output);
  'instanceId'?: (string);
  'address'?: (string);
}
