// Original file: proto_files/builtin_ledger.proto


export interface GrpcBuiltinLedger_CheckLiquidAndReserveRequest {
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
  'payerControlAccountId'?: (string);
  'hubTmpControlAccountId'?: (string);
  '_payerControlAccountId'?: "payerControlAccountId";
  '_hubTmpControlAccountId'?: "hubTmpControlAccountId";
}

export interface GrpcBuiltinLedger_CheckLiquidAndReserveRequest__Output {
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
  'payerControlAccountId'?: (string);
  'hubTmpControlAccountId'?: (string);
}
