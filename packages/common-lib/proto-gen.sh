#!/bin/sh

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --defaults true \
  --enums String \
  --longs String \
  --outDir src/grpc/types \
  src/grpc/*.proto
