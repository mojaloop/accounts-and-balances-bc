// Original file: proto_files/common.proto


export interface _aandb_GrpcControlPlane_CreateAccountsRequestList_GrpcControlPlane_CreateAccountRequest {
  'requestedId'?: (string);
  'ownerId'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
}

export interface _aandb_GrpcControlPlane_CreateAccountsRequestList_GrpcControlPlane_CreateAccountRequest__Output {
  'requestedId'?: (string);
  'ownerId'?: (string);
  'type'?: (string);
  'currencyCode'?: (string);
}

export interface GrpcControlPlane_CreateAccountsRequestList {
  'requests'?: (_aandb_GrpcControlPlane_CreateAccountsRequestList_GrpcControlPlane_CreateAccountRequest)[];
}

export interface GrpcControlPlane_CreateAccountsRequestList__Output {
  'requests': (_aandb_GrpcControlPlane_CreateAccountsRequestList_GrpcControlPlane_CreateAccountRequest__Output)[];
}
