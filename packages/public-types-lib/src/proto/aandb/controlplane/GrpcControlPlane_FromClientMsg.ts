// Original file: proto_files/control_plane.proto

import type { GrpcControlPlane_ClientInitialRequest as _aandb_controlplane_GrpcControlPlane_ClientInitialRequest, GrpcControlPlane_ClientInitialRequest__Output as _aandb_controlplane_GrpcControlPlane_ClientInitialRequest__Output } from '../../aandb/controlplane/GrpcControlPlane_ClientInitialRequest';

export interface GrpcControlPlane_FromClientMsg {
  'initialRequest'?: (_aandb_controlplane_GrpcControlPlane_ClientInitialRequest | null);
  'requestType'?: "initialRequest";
}

export interface GrpcControlPlane_FromClientMsg__Output {
  'initialRequest'?: (_aandb_controlplane_GrpcControlPlane_ClientInitialRequest__Output);
}
