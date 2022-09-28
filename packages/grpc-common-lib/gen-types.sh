#!/bin/sh

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --defaults true \
  --enums String \
  --longs Number \
  --outDir src/types \
  src/accounts_and_balances.proto
