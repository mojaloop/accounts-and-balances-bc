// Original file: src/accounts_and_balances.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcJournalEntry {
  'id'?: (string);
  'externalId'?: (string);
  'externalCategory'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'creditedAccountId'?: (string);
  'debitedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface GrpcJournalEntry__Output {
  'id'?: (string);
  'externalId'?: (string);
  'externalCategory'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'creditedAccountId'?: (string);
  'debitedAccountId'?: (string);
  'timestamp'?: (number);
}
