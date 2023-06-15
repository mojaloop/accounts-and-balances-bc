// Original file: src/accounts_and_balances.proto


export interface GrpcHighLevelStreamRequest {
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

export interface GrpcHighLevelStreamRequest__Output {
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
