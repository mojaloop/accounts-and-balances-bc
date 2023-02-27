FROM node:18.13.0-alpine AS builder

# Create the project directory inside the container.
WORKDIR /app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 libtool autoconf pkgconfig automake bash # wget tar xz

RUN cd $(npm root -g)/npm
RUN npm config set unsafe-perm true
RUN npm install -g node-gyp

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY packages/public-types-lib/package*.json ./packages/public-types-lib/

# need this the client lib to as a dependency - to call the builtin ledger
COPY packages/builtin-ledger-grpc-client-lib/package*.json ./packages/builtin-ledger-grpc-client-lib/

# need this the client lib to as a dependency - has the proto
COPY packages/grpc-client-lib/package*.json ./packages/grpc-client-lib/
COPY packages/grpc-svc/package*.json ./packages/grpc-svc/

# If you are building your code for production
#RUN npm ci --only=production
RUN npm install

########################################
# Copy code and build

# root tsconfig.json
COPY tsconfig.json ./

# copy required supporting packages/packages (especially private ones not published to npm)
COPY packages/public-types-lib ./packages/public-types-lib

# copy required client libs code
COPY packages/builtin-ledger-grpc-client-lib ./packages/builtin-ledger-grpc-client-lib
COPY packages/grpc-client-lib ./packages/grpc-client-lib
# copy service code
COPY packages/grpc-svc ./packages/grpc-svc

# build
RUN npm run build

RUN ls -la ./packages/grpc-svc/dist


FROM node:18.13-alpine
WORKDIR /app

COPY --from=builder /app .

# grpc service
EXPOSE 3300

CMD [ "npm", "run", "start:grpc-svc" ]
