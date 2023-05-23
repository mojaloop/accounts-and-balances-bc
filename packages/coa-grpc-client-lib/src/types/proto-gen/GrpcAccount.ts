// Original file: src/accounts_and_balances.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcAccount {
  'id'?: (string);
  'ownerId'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'postedDebitBalance'?: (string);
  'pendingDebitBalance'?: (string);
  'postedCreditBalance'?: (string);
  'pendingCreditBalance'?: (string);
  'balance'?: (string);
  'timestampLastJournalEntry'?: (number | string | Long);
}

export interface GrpcAccount__Output {
  'id'?: (string);
  'ownerId'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'postedDebitBalance'?: (string);
  'pendingDebitBalance'?: (string);
  'postedCreditBalance'?: (string);
  'pendingCreditBalance'?: (string);
  'balance'?: (string);
  'timestampLastJournalEntry'?: (number);
}
