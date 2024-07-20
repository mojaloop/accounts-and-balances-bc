import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { GrpcBuiltinLedgerServiceClient as _aandb_builtinledger_GrpcBuiltinLedgerServiceClient, GrpcBuiltinLedgerServiceDefinition as _aandb_builtinledger_GrpcBuiltinLedgerServiceDefinition } from './aandb/builtinledger/GrpcBuiltinLedgerService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  aandb: {
    GrpcControlPlane_CreateAccountsRequestList: MessageTypeDefinition
    GrpcControlPlane_CreateAccountsResponse: MessageTypeDefinition
    GrpcControlPlane_CreateAccountsResponseList: MessageTypeDefinition
    GrpcControlPlane_Currency: MessageTypeDefinition
    GrpcControlPlane_Id: MessageTypeDefinition
    GrpcControlPlane_IdList: MessageTypeDefinition
    builtinledger: {
      GrpcBuiltinLedgerService: SubtypeConstructor<typeof grpc.Client, _aandb_builtinledger_GrpcBuiltinLedgerServiceClient> & { service: _aandb_builtinledger_GrpcBuiltinLedgerServiceDefinition }
      GrpcBuiltinLedger_Account: MessageTypeDefinition
      GrpcBuiltinLedger_AccountList: MessageTypeDefinition
      GrpcBuiltinLedger_CancelReservationAndCommitRequest: MessageTypeDefinition
      GrpcBuiltinLedger_CancelReservationRequest: MessageTypeDefinition
      GrpcBuiltinLedger_CheckLiquidAndReserveRequest: MessageTypeDefinition
      GrpcBuiltinLedger_CreateJournalEntryRequestList: MessageTypeDefinition
      GrpcBuiltinLedger_HighLevelRequest: MessageTypeDefinition
      GrpcBuiltinLedger_HighLevelRequestList: MessageTypeDefinition
      GrpcBuiltinLedger_HighLevelResponse: MessageTypeDefinition
      GrpcBuiltinLedger_HighLevelResponseList: MessageTypeDefinition
      GrpcBuiltinLedger_Id: MessageTypeDefinition
      GrpcBuiltinLedger_IdList: MessageTypeDefinition
      GrpcBuiltinLedger_JournalEntry: MessageTypeDefinition
      GrpcBuiltinLedger_JournalEntryList: MessageTypeDefinition
    }
  }
  google: {
    protobuf: {
      Empty: MessageTypeDefinition
    }
  }
}

