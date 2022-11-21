// Original file: src/builtin_ledger.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcAccount {
  'id'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'balance'?: (string);
  'debitBalance'?: (string);
  'creditBalance'?: (string);
  'timestampLastJournalEntry'?: (number | string | Long);
}

export interface GrpcAccount__Output {
  'id'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'balance'?: (string);
  'debitBalance'?: (string);
  'creditBalance'?: (string);
  'timestampLastJournalEntry'?: (number);
}
