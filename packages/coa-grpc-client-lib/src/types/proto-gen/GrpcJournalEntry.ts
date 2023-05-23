// Original file: src/accounts_and_balances.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcJournalEntry {
  'id'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface GrpcJournalEntry__Output {
  'id'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number);
}
