// Original file: src/accounts_and_balances.proto


export interface GrpcHighLevelRequest {
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

export interface GrpcHighLevelRequest__Output {
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
