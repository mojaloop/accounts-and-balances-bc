// Original file: src/accounts_and_balances.proto


export interface GrpcCheckLiquidAndReserveRequest {
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
}

export interface GrpcCheckLiquidAndReserveRequest__Output {
  'payerPositionAccountId'?: (string);
  'payerLiquidityAccountId'?: (string);
  'hubJokeAccountId'?: (string);
  'transferAmount'?: (string);
  'currencyCode'?: (string);
  'payerNetDebitCap'?: (string);
  'transferId'?: (string);
}
