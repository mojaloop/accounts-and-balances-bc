# syntax=docker/dockerfile:1

ARG NODE_ENV=production

FROM node:18.13.0-alpine AS builder

# Install build-only dependencies (root priviliges required).
RUN apk add \
    bash \
    g++ \
    make \
    py-setuptools

# WORKDIR always uses root privileges.
WORKDIR /app
# Change owners of working directory (root priviliges required).
RUN chown node:node .
# Now the user can be changed.
USER node

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

# TODO:
#   - find a way to ignore the postinstall script on the root package.json file ("husky install") when running "npm ci"
# or "npm install"; for now, it has to be removed by hand temporarly before building the image;
#   - find a way to install dependencies from the package-lock.json file, ignoring the ones that regard packages that
# are not included in the image (which "npm ci" doesn't do).

# Copy package-lock.json and package.json files.
COPY ["../../package-lock.json", "../../package.json", "./"]
COPY ["../packages/public-types-lib/package.json", "packages/public-types-lib/"]
COPY ["../packages/grpc-svc/package.json", "packages/grpc-svc/"]

# Install npm dependencies.
RUN npm ci

# Copy dist directories.
COPY ["../packages/public-types-lib/dist", "packages/public-types-lib/dist"]
COPY ["../packages/grpc-svc/dist", "packages/grpc-svc/dist"]

FROM node:18.13.0-alpine

# WORKDIR always uses root privileges.
WORKDIR /app
# Change owners of working directory (root priviliges required).
RUN chown node:node .
# Now the user can be changed.
USER node

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

COPY --from=builder /app .

EXPOSE 1234

# https://adambrodziak.pl/dockerfile-good-practices-for-node-and-npm#use-node-not-npm-to-start-the-server
# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#cmd
CMD ["node", "packages/grpc-svc/dist/application/index.js"]
