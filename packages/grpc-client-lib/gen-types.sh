#!/bin/sh

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --longs Number \
  -O ./src/types/ \
  ./src/accounts_and_balances.proto
