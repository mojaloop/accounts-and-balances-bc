// Original file: src/accounts_and_balances.proto

import type { GrpcJournalEntry as _GrpcJournalEntry, GrpcJournalEntry__Output as _GrpcJournalEntry__Output } from './GrpcJournalEntry';

export interface GrpcGetJournalEntriesByAccountIdResponse {
  'journalEntriesFound'?: (boolean);
  'grpcJournalEntries'?: (_GrpcJournalEntry)[];
}

export interface GrpcGetJournalEntriesByAccountIdResponse__Output {
  'journalEntriesFound'?: (boolean);
  'grpcJournalEntries'?: (_GrpcJournalEntry__Output)[];
}
