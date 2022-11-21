#!/bin/sh

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --longs Number \
  -O ./src/types/ \
  ./src/builtin_ledger.proto
