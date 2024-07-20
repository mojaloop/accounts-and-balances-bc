// Original file: proto_files/control_plane.proto

export const GrpcControlPlane_LedgerServiceType = {
  BuiltinGrpc: 0,
  TigerBeetle: 1,
} as const;

export type GrpcControlPlane_LedgerServiceType =
  | 'BuiltinGrpc'
  | 0
  | 'TigerBeetle'
  | 1

export type GrpcControlPlane_LedgerServiceType__Output = typeof GrpcControlPlane_LedgerServiceType[keyof typeof GrpcControlPlane_LedgerServiceType]
