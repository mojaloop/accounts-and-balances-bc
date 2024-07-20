// Original file: proto_files/control_plane.proto

import type { GrpcControlPlane_LedgerServiceType as _aandb_controlplane_GrpcControlPlane_LedgerServiceType, GrpcControlPlane_LedgerServiceType__Output as _aandb_controlplane_GrpcControlPlane_LedgerServiceType__Output } from '../../aandb/controlplane/GrpcControlPlane_LedgerServiceType';
import type { GrpcControlPlane_LedgerEndpointDetails as _aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails, GrpcControlPlane_LedgerEndpointDetails__Output as _aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails__Output } from '../../aandb/controlplane/GrpcControlPlane_LedgerEndpointDetails';
import type { GrpcControlPlane_CoaAccountList as _aandb_controlplane_GrpcControlPlane_CoaAccountList, GrpcControlPlane_CoaAccountList__Output as _aandb_controlplane_GrpcControlPlane_CoaAccountList__Output } from '../../aandb/controlplane/GrpcControlPlane_CoaAccountList';
import type { GrpcControlPlane_CoaCurrencyList as _aandb_controlplane_GrpcControlPlane_CoaCurrencyList, GrpcControlPlane_CoaCurrencyList__Output as _aandb_controlplane_GrpcControlPlane_CoaCurrencyList__Output } from '../../aandb/controlplane/GrpcControlPlane_CoaCurrencyList';

export interface GrpcControlPlane_InitialResponseToClient {
  'ledgerServiceType'?: (_aandb_controlplane_GrpcControlPlane_LedgerServiceType);
  'ledgerEndpointDetails'?: (_aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails | null);
  'accountMap'?: (_aandb_controlplane_GrpcControlPlane_CoaAccountList | null);
  'coaCurrencies'?: (_aandb_controlplane_GrpcControlPlane_CoaCurrencyList | null);
}

export interface GrpcControlPlane_InitialResponseToClient__Output {
  'ledgerServiceType'?: (_aandb_controlplane_GrpcControlPlane_LedgerServiceType__Output);
  'ledgerEndpointDetails'?: (_aandb_controlplane_GrpcControlPlane_LedgerEndpointDetails__Output);
  'accountMap'?: (_aandb_controlplane_GrpcControlPlane_CoaAccountList__Output);
  'coaCurrencies'?: (_aandb_controlplane_GrpcControlPlane_CoaCurrencyList__Output);
}
