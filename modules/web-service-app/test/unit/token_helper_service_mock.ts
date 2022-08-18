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
import nock from "nock";

export class TokenHelperServiceMock {
	// Properties received through the constructor.
	private readonly ISSUER_NAME: string;
	private readonly JWKS_URL: string;
	private readonly AUDIENCE: string;
	private readonly logger: ILogger;
	// Other properties.
	// This token lasts for 100 years - if the keys are ok, it should verify.
	public static readonly VALID_TOKEN: string = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Inp1MGR4WXErTllrWHpPWmZsak5hU1F3MEVXMVQ1KzJ1ZHByQy9Vekt4aGc9In0.eyJ0ZXN0T2JqIjoicGVkcm8xIiwiaWF0IjoxNjQ3NDUyMDM5LCJleHAiOjQ4MDEwNTIwMzksImF1ZCI6InZOZXh0IHBsYXRmb3JtIiwiaXNzIjoidk5leHQgU2VjdXJpdHkgQkMgLSBBdXRob3JpemF0aW9uIFN2YyIsInN1YiI6InVzZXIiLCJqdGkiOiJ6dTBkeFlxK05Za1h6T1pmbGpOYVNRdzBFVzFUNSsydWRwckMvVXpLeGhnPSJ9.d_BXmofxhYr_WbxAte8RgbCQEZcMKiUeEeOLJRR2QaFjg7Wbz_QlgpZzRphFZWQYACIXrrpw4C7xg1NxA4fvokw6DrI41MTzOVd2dk79Le1hK1JotPMpscFiUCOED8Vurv_s-AnxoeHWv5RdB00-nlSB1HkFmArT3TOAVdsOMaiTGhBjI0phhcVo0UuY6f9qYpUcS-rYVW7zf0pAWDhYg_rfX6-ntHxpc6wuq8fQDJs-I-nRzdlS1yrBp9cWN5cDC9qAxXLC4f8ZVl5PSZl-V07MBivPk1zUXm1j62e5tF2MIVyoRSKf2h90J2hAdR-4MAb9wP5_HOhUw12w4YQyAQ";

	constructor(
		issuerName: string,
		jwksUrl: string,
		audience: string,
		logger: ILogger
	) {
		this.ISSUER_NAME = issuerName;
		this.JWKS_URL = jwksUrl;
		this.AUDIENCE = audience;
		this.logger = logger;

		this.setUp();
	}

	private setUp(): void {
		const jwksUrl = new URL(this.JWKS_URL); // TODO: verify.
		nock(jwksUrl.origin)
		.persist()
		.get(jwksUrl.pathname)
		.reply(
			200,
			{
				"keys": [{
					"alg": "RS256",
					"e": "AQAB",
					"kid": "zu0dxYq+NYkXzOZfljNaSQw0EW1T5+2udprC/UzKxhg=",
					"kty": "RSA",
					"n": "ALvyNb619slh5kS/YkvRUEiYdru8Jlf7js+eNFe/L6OgOmxsYyqZYMRnZUYSrRQpBNardxOC/+uw1Nh3V1vyH6cj5SF" +
						"Ivj/nS9EYY0p8QxRt+9Sfjd4qtPWVxmfVuYslVPW/RYtJ2oR5DhY1x0+pqh54mJkqTqPFB6rXd/vq/z5NehInefBsLi4DG" +
						"+VTJg/j3b8Ree7OiysnTRePUyZQKH0OOzRIVtQvLTiYe964uOdhqQb/J+pQGawdClqzjd1s78O2Vm+CLgnNpJbYmbOvAtl" +
						"ERK1Gn8rEGHO5VgwyDeIrBzld/yVVyGQ85WSI7JzUwlBr5NA9qaEyINCo6/4apGk=",
					"use": "sig"
				}]
			}
		);
	}
}
