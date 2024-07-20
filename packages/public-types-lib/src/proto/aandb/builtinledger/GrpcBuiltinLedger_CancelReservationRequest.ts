// Original file: proto_files/builtin_ledger.proto


export interface GrpcBuiltinLedger_CancelReservationRequest {
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'transferId'?: (string);
  'payerControlAccountId'?: (string);
  'hubTmpControlAccountId'?: (string);
  '_payerControlAccountId'?: "payerControlAccountId";
  '_hubTmpControlAccountId'?: "hubTmpControlAccountId";
}

export interface GrpcBuiltinLedger_CancelReservationRequest__Output {
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'transferId'?: (string);
  'payerControlAccountId'?: (string);
  'hubTmpControlAccountId'?: (string);
}
