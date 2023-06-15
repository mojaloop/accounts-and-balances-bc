// Original file: src/builtin_ledger.proto


export interface BuiltinLedgerGrpcCancelReservationAndCommitRequest {
  'payerPositionAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'transferId'?: (string);
}

export interface BuiltinLedgerGrpcCancelReservationAndCommitRequest__Output {
  'payerPositionAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'transferId'?: (string);
}
