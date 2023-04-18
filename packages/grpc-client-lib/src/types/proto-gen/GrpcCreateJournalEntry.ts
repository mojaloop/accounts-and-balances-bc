// Original file: src/accounts_and_balances.proto


export interface GrpcCreateJournalEntry {
  'requestedId'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}

export interface GrpcCreateJournalEntry__Output {
  'requestedId'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}
