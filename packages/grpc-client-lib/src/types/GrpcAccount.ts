// Original file: src/accounts_and_balances.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcAccount {
  'id'?: (string);
  'externalId'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'currencyDecimals'?: (number);
  'debitBalance'?: (string);
  'creditBalance'?: (string);
  'timestampLastJournalEntry'?: (number | string | Long);
}

export interface GrpcAccount__Output {
  'id'?: (string);
  'externalId'?: (string);
  'state'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
  'currencyDecimals'?: (number);
  'debitBalance'?: (string);
  'creditBalance'?: (string);
  'timestampLastJournalEntry'?: (number);
}
