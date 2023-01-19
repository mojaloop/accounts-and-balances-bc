import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { GrpcAccountsAndBalancesClient as _GrpcAccountsAndBalancesClient, GrpcAccountsAndBalancesDefinition as _GrpcAccountsAndBalancesDefinition } from './GrpcAccountsAndBalances';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  GrpcAccount: MessageTypeDefinition
  GrpcAccountArray: MessageTypeDefinition
  GrpcAccountsAndBalances: SubtypeConstructor<typeof grpc.Client, _GrpcAccountsAndBalancesClient> & { service: _GrpcAccountsAndBalancesDefinition }
  GrpcId: MessageTypeDefinition
  GrpcIdArray: MessageTypeDefinition
  GrpcJournalEntry: MessageTypeDefinition
  GrpcJournalEntryArray: MessageTypeDefinition
  google: {
    protobuf: {
      Empty: MessageTypeDefinition
    }
  }
}

