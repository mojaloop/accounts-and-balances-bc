#!/bin/sh

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --defaults true \
  --enums String \
  --longs String \
  --outDir src/proto/gen \
  src/proto/*.proto
