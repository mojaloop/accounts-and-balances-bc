// Original file: src/builtin_ledger.proto


export interface BuiltinLedgerGrpcHighLevelStreamRequest {
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

export interface BuiltinLedgerGrpcHighLevelStreamRequest__Output {
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
