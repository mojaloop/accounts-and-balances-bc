// Original file: src/accounts_and_balances.proto

import type { GrpcAccount as _GrpcAccount, GrpcAccount__Output as _GrpcAccount__Output } from './GrpcAccount';

export interface GrpcGetAccountByIdResponse {
  'accountFound'?: (boolean);
  'grpcAccount'?: (_GrpcAccount | null);
}

export interface GrpcGetAccountByIdResponse__Output {
  'accountFound'?: (boolean);
  'grpcAccount'?: (_GrpcAccount__Output);
}
