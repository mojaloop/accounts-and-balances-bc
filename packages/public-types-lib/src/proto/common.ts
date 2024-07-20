import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';


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
  }
  google: {
    protobuf: {
      Empty: MessageTypeDefinition
    }
  }
}

