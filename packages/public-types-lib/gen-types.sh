#!/bin/sh

PROTO_FILE="./proto_files/*.proto"
OUTDIR="./src/proto/"

rm -Rf $OUTDIR

#  --longs Number --keepCase true -oneofs true --arrays\

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --longs Number --keepCase true -oneofs true --arrays\
  -O $OUTDIR \
  $PROTO_FILE
