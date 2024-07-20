#!/bin/sh -x

PROTO_FILE="../proto_files/control_plane.proto"
OUTDIR="./src/_proto_types/"

rm -Rf $OUTDIR

proto-loader-gen-types \
  --grpcLib @grpc/grpc-js \
  --longs Number \
  --oneofs \
  -O $OUTDIR \
  $PROTO_FILE
