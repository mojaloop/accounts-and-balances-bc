// Original file: src/accounts_and_balances.proto

import type { GrpcJournalEntry as _GrpcJournalEntry, GrpcJournalEntry__Output as _GrpcJournalEntry__Output } from 'packages/grpc-client-lib/src/types/GrpcJournalEntry';

export interface GrpcGetJournalEntriesByAccountIdResponse {
  'journalEntriesFound'?: (boolean);
  'grpcJournalEntries'?: (_GrpcJournalEntry)[];
}

export interface GrpcGetJournalEntriesByAccountIdResponse__Output {
  'journalEntriesFound'?: (boolean);
  'grpcJournalEntries'?: (_GrpcJournalEntry__Output)[];
}
