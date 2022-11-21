import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { GrpcBuiltinLedgerClient as _GrpcBuiltinLedgerClient, GrpcBuiltinLedgerDefinition as _GrpcBuiltinLedgerDefinition } from './GrpcBuiltinLedger';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  GrpcAccount: MessageTypeDefinition
  GrpcAccountArray: MessageTypeDefinition
  GrpcBuiltinLedger: SubtypeConstructor<typeof grpc.Client, _GrpcBuiltinLedgerClient> & { service: _GrpcBuiltinLedgerDefinition }
  GrpcId: MessageTypeDefinition
  GrpcIdArray: MessageTypeDefinition
  GrpcJournalEntry: MessageTypeDefinition
  GrpcJournalEntryArray: MessageTypeDefinition
}

