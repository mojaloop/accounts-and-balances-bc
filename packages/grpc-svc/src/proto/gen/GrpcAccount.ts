// Original file: src/proto/accounts_and_balances.proto

import type { GrpcAccountState as _GrpcAccountState } from './GrpcAccountState';
import type { GrpcAccountType as _GrpcAccountType } from './GrpcAccountType';
import type { Long } from '@grpc/proto-loader';

export interface GrpcAccount {
  'id'?: (string);
  'externalId'?: (string);
  'state'?: (_GrpcAccountState | keyof typeof _GrpcAccountState);
  'type'?: (_GrpcAccountType | keyof typeof _GrpcAccountType);
  'currency'?: (string);
  'creditBalance'?: (number | string | Long);
  'debitBalance'?: (number | string | Long);
  'timestampLastJournalEntry'?: (number | string | Long);
}

export interface GrpcAccount__Output {
  'id': (string);
  'externalId': (string);
  'state': (keyof typeof _GrpcAccountState);
  'type': (keyof typeof _GrpcAccountType);
  'currency': (string);
  'creditBalance': (string);
  'debitBalance': (string);
  'timestampLastJournalEntry': (string);
}
