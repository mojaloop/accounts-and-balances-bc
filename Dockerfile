# syntax=docker/dockerfile:1

FROM node:18.13.0-alpine AS builder

# TODO: required?
ENV NODE_ENV=development

# Create the project directory inside the container.
WORKDIR /app

# Install the dependencies before proceeding (to avoid doing stuff in vain, in case of error). TODO: what are these dependencies?
RUN apk add --no-cache git
RUN apk add --no-cache -t build-dependencies \
    make \
    gcc \
    g++ \
    python3 \
    libtool \
    libressl-dev \
    openssl-dev \
    autoconf \
    automake \
    bash \
    wget \
    tar \
    xz
RUN cd $(npm root -g)/npm
RUN npm config set unsafe-perm true
RUN npm install -g node-gyp

# Copy the package.json and package-lock.json files.
COPY package.json package-lock.json ./
COPY packages/public-types-lib/package.json packages/public-types-lib
COPY packages/builtin-ledger-grpc-svc/package.json packages/builtin-ledger-grpc-svc
COPY packages/coa-grpc-svc/package.json packages/grpc-svc

# Install the project dependencies before copying the code (to avoid copying stuff in vain, in case of error).
RUN npm install

COPY tsconfig.json ./
# Copy the code.
COPY packages/public-types-lib ./packages/public-types-lib
COPY packages/builtin-ledger-grpc-svc ./packages/builtin-ledger-grpc-svc
COPY packages/coa-grpc-svc ./packages/grpc-svc

RUN npm run build

# Create the final image.
FROM node:18.13.0-alpine
WORKDIR /app
COPY --from=builder /app .

EXPOSE 1234

CMD npm run start:accounts-and-balances-svc
