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
import grpc from "@grpc/grpc-js";
import protoLoader, {PackageDefinition} from "@grpc/proto-loader";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {GrpcObject} from "@grpc/grpc-js/src/make-client";

export class GrpcServer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	// Other properties.
	private grpcServer: grpc.Server;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		tokenHelper: TokenHelper,
		aggregate: Aggregate
	) {
		this.logger = logger;
		this.HOST = host;
		this.PORT_NO = portNo;

		const packageDefinition: PackageDefinition = protoLoader.loadSync(
			PROTO_PATH,
			{
				eepCase: true,
				longs: String,
				enums: String,
				defaults: true,
				oneofs: true
			}
		);
		const protoDescriptor: GrpcObject = grpc.loadPackageDefinition(packageDefinition);
		const routeguide = protoDescriptor.routeguide;

		this.grpcServer = new grpc.Server();

		this.configure();
	}

	private configure() {
		this.grpcServer.addService(
			AccountsAndBalancesGrpcService,
			new Routes()
		);
	}

	// TODO: name; async?
	init(): void {
		try {
			this.grpcServer.bindAsync(
				this.PORT_NO.toString(),
				grpc.ServerCredentials.createInsecure(),
				() => {
					this.grpcServer.start();
				}
			);
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	// TODO: name; async?
	destroy(): void {
		this.grpcServer.destroy(); // TODO.
	}
}
