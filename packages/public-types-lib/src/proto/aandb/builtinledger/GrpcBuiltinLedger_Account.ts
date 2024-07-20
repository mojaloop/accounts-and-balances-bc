// Original file: proto_files/builtin_ledger.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcBuiltinLedger_Account {
  'id'?: (string);
  'state'?: (string);
  'currencyCode'?: (string);
  'postedDebitBalance'?: (string);
  'pendingDebitBalance'?: (string);
  'postedCreditBalance'?: (string);
  'pendingCreditBalance'?: (string);
  'balance'?: (string);
  'timestampLastJournalEntry'?: (number | string | Long);
  '_timestampLastJournalEntry'?: "timestampLastJournalEntry";
}

export interface GrpcBuiltinLedger_Account__Output {
  'id'?: (string);
  'state'?: (string);
  'currencyCode'?: (string);
  'postedDebitBalance'?: (string);
  'pendingDebitBalance'?: (string);
  'postedCreditBalance'?: (string);
  'pendingCreditBalance'?: (string);
  'balance'?: (string);
  'timestampLastJournalEntry'?: (number);
}
