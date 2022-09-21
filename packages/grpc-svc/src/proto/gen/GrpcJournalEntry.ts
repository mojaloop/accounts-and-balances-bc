// Original file: src/proto/accounts_and_balances.proto

import type { Long } from '@grpc/proto-loader';

export interface GrpcJournalEntry {
  'id'?: (string);
  'externalId'?: (string);
  'externalCategory'?: (string);
  'currency'?: (string);
  'amount'?: (number | string | Long);
  'creditedAccountId'?: (string);
  'debitedAccountId'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface GrpcJournalEntry__Output {
  'id': (string);
  'externalId': (string);
  'externalCategory': (string);
  'currency': (string);
  'amount': (string);
  'creditedAccountId': (string);
  'debitedAccountId': (string);
  'timestamp': (string);
}
