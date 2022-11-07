// Original file: src/accounts_and_balances.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcJournalEntry {
  'id'?: (string);
  'externalId'?: (string);
  'externalCategory'?: (string);
  'currencyCode'?: (string);
  'currencyDecimals'?: (number);
  'amount'?: (string);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface GrpcJournalEntry__Output {
  'id'?: (string);
  'externalId'?: (string);
  'externalCategory'?: (string);
  'currencyCode'?: (string);
  'currencyDecimals'?: (number);
  'amount'?: (string);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
  'timestamp'?: (number);
}
