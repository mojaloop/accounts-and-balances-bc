// Original file: proto_files/builtin_ledger.proto


export interface _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList_GrpcBuiltinLedger_CreateJournalEntryRequest {
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}

export interface _aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList_GrpcBuiltinLedger_CreateJournalEntryRequest__Output {
  'ownerId'?: (string);
  'currencyCode'?: (string);
  'amount'?: (string);
  'pending'?: (boolean);
  'debitedAccountId'?: (string);
  'creditedAccountId'?: (string);
}

export interface GrpcBuiltinLedger_CreateJournalEntryRequestList {
  'entriesToCreate'?: (_aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList_GrpcBuiltinLedger_CreateJournalEntryRequest)[];
}

export interface GrpcBuiltinLedger_CreateJournalEntryRequestList__Output {
  'entriesToCreate': (_aandb_builtinledger_GrpcBuiltinLedger_CreateJournalEntryRequestList_GrpcBuiltinLedger_CreateJournalEntryRequest__Output)[];
}
