// Original file: proto_files/control_plane.proto

import type { GrpcControlPlane_LedgerInitialMsg as _aandb_controlplane_GrpcControlPlane_LedgerInitialMsg, GrpcControlPlane_LedgerInitialMsg__Output as _aandb_controlplane_GrpcControlPlane_LedgerInitialMsg__Output } from '../../aandb/controlplane/GrpcControlPlane_LedgerInitialMsg';

export interface GrpcControlPlane_FromLedgerMsg {
  'initialMsg'?: (_aandb_controlplane_GrpcControlPlane_LedgerInitialMsg | null);
  'requestType'?: "initialMsg";
}

export interface GrpcControlPlane_FromLedgerMsg__Output {
  'initialMsg'?: (_aandb_controlplane_GrpcControlPlane_LedgerInitialMsg__Output);
}
