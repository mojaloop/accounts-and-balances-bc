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
import {Aggregate} from "@mojaloop/accounts-and-balances-bc-domain-lib";
// import grpc, {GrpcObject, ServiceDefinition} from "@grpc/grpc-js";
// import protoLoader, {PackageDefinition} from "@grpc/proto-loader";
import {
	GrpcObject,
	loadPackageDefinition,
	Server,
	ServerCredentials,
	ServiceDefinition
} from "@grpc/grpc-js";
import {loadSync, PackageDefinition} from "@grpc/proto-loader";
import {ProtoGrpcType} from "./proto/gen/accounts_and_balances";
import {AccountsAndBalancesGrpcServiceHandlers} from "./proto/gen/AccountsAndBalancesGrpcService";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {Handlers} from "./rpcs";

export class GrpcServer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	// Other properties.
	private static readonly PROTO_FILE_PATH: string = "/home/goncalogarcia/Documents/Work/Mojaloop/vNext/BoundedContexts/accounts-and-balances-bc/packages/grpc-svc/src/proto/accounts_and_balances.proto"; // TODO: here?
	private readonly server: Server;

	constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
		aggregate: Aggregate,
		host: string,
		portNo: number
	) {
		this.logger = logger;
		this.HOST = host;
		this.PORT_NO = portNo;

		const packageDefinition: PackageDefinition = loadSync(
			GrpcServer.PROTO_FILE_PATH,
			{
				longs: String,
				enums: String,
				defaults: true
			}
		); // TODO: check other params.
		const grpcObject: GrpcObject = loadPackageDefinition(packageDefinition);
		const serviceDefinition: ServiceDefinition =
			(grpcObject as unknown as ProtoGrpcType).AccountsAndBalancesGrpcService.service;

		const handlers: Handlers = new Handlers(
			this.logger,
			aggregate
		);
		const serviceImplementation: AccountsAndBalancesGrpcServiceHandlers = handlers.getHandlers();

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
					if (error) {
						reject(error);
					}
					this.server.start();
					this.logger.info("* * * * * * * * * * * * * * * * * * * *");
					this.logger.info("gRPC server started 🚀");
					this.logger.info(`Host: ${this.HOST}`);
					this.logger.info(`Port: ${this.PORT_NO}`);
					this.logger.info(`Base URL: grpc://${this.HOST}:${this.PORT_NO}`); // TODO: makes sense?
					this.logger.info("* * * * * * * * * * * * * * * * * * * *");
					resolve();
				}
			);
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			this.server.tryShutdown(() => {
				this.logger.info("* * * * * * * * * * * * * * * * * * * *");
				this.logger.info("gRPC server stopped 🏁");
				this.logger.info("* * * * * * * * * * * * * * * * * * * *");
				resolve();
			});
			// this.grpcServer.forceShutdown();
			// this.grpcServer.removeService();
			// this.grpcServer.unregister();
		});
	}
}
