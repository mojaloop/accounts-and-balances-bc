// Original file: src/builtin_ledger.proto

import type { Long } from '@grpc/proto-loader';

export interface BuiltinLedgerGrpcJournalEntry {
  'id'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface BuiltinLedgerGrpcJournalEntry__Output {
  'id'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number);
}
