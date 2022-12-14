// Original file: src/builtin_ledger.proto

import type { Long } from '@grpc/proto-loader';

export interface BuiltinLedgerGrpcAccount {
  'id'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'debitBalance'?: (string);
  'creditBalance'?: (string);
  'timestampLastJournalEntry'?: (number | string | Long);
}

export interface BuiltinLedgerGrpcAccount__Output {
  'id'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'debitBalance'?: (string);
  'creditBalance'?: (string);
  'timestampLastJournalEntry'?: (number);
}
