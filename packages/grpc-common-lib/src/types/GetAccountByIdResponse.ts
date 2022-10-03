// Original file: src/accounts_and_balances.proto

import type { GrpcAccount as _GrpcAccount, GrpcAccount__Output as _GrpcAccount__Output } from './GrpcAccount';

export interface GetAccountByIdResponse {
  'found'?: (boolean);
  'account'?: (_GrpcAccount | null);
}

export interface GetAccountByIdResponse__Output {
  'found'?: (boolean);
  'account'?: (_GrpcAccount__Output);
}
