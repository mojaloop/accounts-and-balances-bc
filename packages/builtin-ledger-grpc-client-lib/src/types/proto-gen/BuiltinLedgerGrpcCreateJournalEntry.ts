// Original file: src/builtin_ledger.proto


export interface BuiltinLedgerGrpcCreateJournalEntry {
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}

export interface BuiltinLedgerGrpcCreateJournalEntry__Output {
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}
