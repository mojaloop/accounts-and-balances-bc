// Original file: src/builtin_ledger.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcJournalEntry {
  'id'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface GrpcJournalEntry__Output {
  'id'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number);
}
