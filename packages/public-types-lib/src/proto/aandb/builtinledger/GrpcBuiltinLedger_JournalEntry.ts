// Original file: proto_files/builtin_ledger.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcBuiltinLedger_JournalEntry {
  'id'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface GrpcBuiltinLedger_JournalEntry__Output {
  'id'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number);
}
