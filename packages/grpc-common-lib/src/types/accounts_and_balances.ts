import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { AccountsAndBalancesGrpcServiceClient as _AccountsAndBalancesGrpcServiceClient, AccountsAndBalancesGrpcServiceDefinition as _AccountsAndBalancesGrpcServiceDefinition } from './AccountsAndBalancesGrpcService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  AccountsAndBalancesGrpcService: SubtypeConstructor<typeof grpc.Client, _AccountsAndBalancesGrpcServiceClient> & { service: _AccountsAndBalancesGrpcServiceDefinition }
  GetAccountByIdResponse: MessageTypeDefinition
  GrpcAccount: MessageTypeDefinition
  GrpcAccountArray: MessageTypeDefinition
  GrpcAccountState: EnumTypeDefinition
  GrpcAccountType: EnumTypeDefinition
  GrpcId: MessageTypeDefinition
  GrpcIdArray: MessageTypeDefinition
  GrpcJournalEntry: MessageTypeDefinition
  GrpcJournalEntryArray: MessageTypeDefinition
}

