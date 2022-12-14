/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	GrpcObject,
	loadPackageDefinition,
	Server,
	ServerCredentials,
	ServiceDefinition
} from "@grpc/grpc-js";
import {loadSync, Options, PackageDefinition} from "@grpc/proto-loader";

import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {AccountsAndBalancesAggregate} from "../../domain/aggregate";
import {GrpcHandlers} from "./grpc_handlers";
import {GrpcAccountsAndBalancesHandlers, ProtoGrpcType} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {join, resolve} from "path";

export class GrpcServer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	// Other properties.
	private static readonly PROTO_FILE_RELATIVE_PATH: string =
		"../../../builtin-ledger-grpc-client-lib/src/builtin_ledger.proto";
	private static readonly LOAD_PROTO_OPTIONS: Options = {
		longs: Number
	};
	private readonly server: Server;

	constructor(
		logger: ILogger,
		//tokenHelper: TokenHelper,
		aggregate: AccountsAndBalancesAggregate,
		host: string,
		portNo: number
	) {
		this.logger = logger.createChild(this.constructor.name);
        //this.logger = logger;
		this.HOST = host;
		this.PORT_NO = portNo;

		//const protoFileAbsolutePath: string = resolve("../../../../grpc-client-lib/src/accounts_and_balances.proto");
		const protoFileAbsolutePath: string = join(__dirname, "../../../../grpc-client-lib/src/accounts_and_balances.proto");
		const packageDefinition: PackageDefinition = loadSync(
			protoFileAbsolutePath,
			GrpcServer.LOAD_PROTO_OPTIONS
		);
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		const serviceDefinition: ServiceDefinition =
			(grpcObject as unknown as ProtoGrpcType).GrpcAccountsAndBalances.service;

		const grpcHandlers: GrpcHandlers = new GrpcHandlers(
			this.logger,
			aggregate
		);
		const serviceImplementation: GrpcAccountsAndBalancesHandlers = grpcHandlers.getHandlers();

		this.server = new Server();
		this.server.addService(
			serviceDefinition,
			serviceImplementation
		);
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.bindAsync(
				`${this.HOST}:${this.PORT_NO}`,
				ServerCredentials.createInsecure(),
				(error) => {
					if (error !== null) {
						reject(error);
						return;
					}

					this.server.start();
					this.logger.info("* * * * * * * * * * * * * * * * * * * *");
					this.logger.info("gRPC server started 🚀");
					this.logger.info(`Host: ${this.HOST}`);
					this.logger.info(`Port: ${this.PORT_NO}`);
					this.logger.info("* * * * * * * * * * * * * * * * * * * *");
					resolve();
				}
			);
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.tryShutdown((error) => {
				// When tryShutdown() is called on a server that is not running, the callback's error is not defined.
				// The documentation doesn't specify in what cases the callback's error will be defined, nor if
				// forceShutdown() should be called on error. TODO: investigate.
				if (error !== undefined) {
					reject(error);
					return;
				}

				this.logger.info("* * * * * * * * * * * * * * * * * * * *");
				this.logger.info("gRPC server stopped 🏁");
				this.logger.info("* * * * * * * * * * * * * * * * * * * *");
				resolve();
			});
		});
	}
}
