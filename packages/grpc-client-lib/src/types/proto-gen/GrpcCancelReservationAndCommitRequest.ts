// Original file: src/accounts_and_balances.proto


export interface GrpcCancelReservationAndCommitRequest {
  'payerPositionAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'transferId'?: (string);
}

export interface GrpcCancelReservationAndCommitRequest__Output {
  'payerPositionAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'transferId'?: (string);
}
