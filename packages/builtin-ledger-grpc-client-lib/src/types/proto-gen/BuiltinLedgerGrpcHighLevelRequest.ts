// Original file: src/builtin_ledger.proto


export interface BuiltinLedgerGrpcHighLevelRequest {
  'requestType'?: (number);
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
}

export interface BuiltinLedgerGrpcHighLevelRequest__Output {
  'requestType'?: (number);
  'requestId'?: (string);
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'payeePositionAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
}
