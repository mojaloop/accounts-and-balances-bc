// Original file: src/builtin_ledger.proto


export interface BuiltinLedgerGrpcCheckLiquidAndReserveRequest {
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
}

export interface BuiltinLedgerGrpcCheckLiquidAndReserveRequest__Output {
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
}
