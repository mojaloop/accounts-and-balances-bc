// Original file: src/builtin_ledger.proto


export interface BuiltinLedgerGrpcCreateJournalEntry {
  'requestedId'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}

export interface BuiltinLedgerGrpcCreateJournalEntry__Output {
  'requestedId'?: (string);
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}
