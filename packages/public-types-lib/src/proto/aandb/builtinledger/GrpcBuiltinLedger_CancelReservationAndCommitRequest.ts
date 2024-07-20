// Original file: proto_files/builtin_ledger.proto


export interface GrpcBuiltinLedger_CancelReservationAndCommitRequest {
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'currencyNum'?: (string);
  'currencyDecimals'?: (number);
  'transferId'?: (string);
  'payerControlAccountId'?: (string);
  'hubTmpControlAccountId'?: (string);
  'payeeControlAccountId'?: (string);
  '_payerControlAccountId'?: "payerControlAccountId";
  '_hubTmpControlAccountId'?: "hubTmpControlAccountId";
  '_payeeControlAccountId'?: "payeeControlAccountId";
}

export interface GrpcBuiltinLedger_CancelReservationAndCommitRequest__Output {
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'currencyNum'?: (string);
  'currencyDecimals'?: (number);
  'transferId'?: (string);
  'payerControlAccountId'?: (string);
  'hubTmpControlAccountId'?: (string);
  'payeeControlAccountId'?: (string);
}
