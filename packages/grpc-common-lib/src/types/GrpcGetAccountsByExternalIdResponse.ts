// Original file: src/accounts_and_balances.proto

import type { GrpcAccount as _GrpcAccount, GrpcAccount__Output as _GrpcAccount__Output } from './GrpcAccount';

export interface GrpcGetAccountsByExternalIdResponse {
  'accountsFound'?: (boolean);
  'grpcAccounts'?: (_GrpcAccount)[];
}

export interface GrpcGetAccountsByExternalIdResponse__Output {
  'accountsFound'?: (boolean);
  'grpcAccounts'?: (_GrpcAccount__Output)[];
}
