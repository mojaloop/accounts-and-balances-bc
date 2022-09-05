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

export class AuthenticationServiceMock {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	public static readonly ISSUER_NAME: string = "http://localhost:3201/";
	public static readonly JWKS_URL: string = "http://localhost:3201/.well-known/jwks.json";
	public static readonly AUDIENCE: string = "mojaloop.vnext.default_audience";
	public static readonly VALID_ACCESS_TOKEN: string = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNSMHVoT2hpM05VbmJlMTF5SDZtOUZtcFpNN2JiRVl2czdpbGNfanN1MHMifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbXSwiaWF0IjoxNjYyMjE5NzQ5LCJleHAiOjQ4MTc5MTQ5NDksImF1ZCI6Im1vamFsb29wLnZuZXh0LmRlZmF1bHRfYXVkaWVuY2UiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjMyMDEvIiwic3ViIjoidXNlcjo6dXNlciIsImp0aSI6ImJjYzk3OWRlLTdkNzItNGUyNC04YjIyLWM5NjlmMDAwYTg0YSJ9.py8iSYZp0KtZ1os7vXoH8oOAZFQCJyj3gWNW3EQTGl-cS8U6ErJpEv0nGrNfPGIdwNgSBe0esjlLKU7hCA-p71AnToCxA3zDqMaB6Pm7FH376AP71VTTGNa2rcWMrQivPEFzlxpvlIV-KWVrJUE2j0-SVPjlSphBnqBHybID_y3I1Ix5eoKsotZrBNeVzYqRcN7lUnbdxb7Oi5-ss5bmmo__iAB4EaW8LfdgiIL3AsYrxWoRdsBNOa1v7AJ6v7z7HcWzdJ1hF_DgG7wX2sVRHZcCnT55bL-zb614csaUbEeOpOmQ5STsR9rdSFPfN2vzpD9OX6b2uHj4digHQtuCDA";

	constructor(
		logger: ILogger
	) {
		this.logger = logger;

		this.setUp();
	}

	private setUp(): void {
		const jwksUrl = new URL(AuthenticationServiceMock.JWKS_URL); // TODO: verify.
		nock(jwksUrl.origin)
		.persist()
		.get(jwksUrl.pathname)
		.reply(
			200,
			{
				"keys": [
					{
						"kty": "RSA",
						"kid": "sR0uhOhi3NUnbe11yH6m9FmpZM7bbEYvs7ilc_jsu0s",
						"n": "u_I1vrX2yWHmRL9iS9FQSJh2u7wmV_uOz540V78vo6A6bGxjKplgxGdlRhKtFCkE1qt3E4L_67DU2HdXW_IfpyPlIUi-P-dL0RhjSnxDFG371J-N3iq09ZXGZ9W5iyVU9b9Fi0nahHkOFjXHT6mqHniYmSpOo8UHqtd3--r_Pk16Eid58GwuLgMb5VMmD-PdvxF57s6LKydNF49TJlAofQ47NEhW1C8tOJh73ri452GpBv8n6lAZrB0KWrON3Wzvw7ZWb4IuCc2kltiZs68C2URErUafysQYc7lWDDIN4isHOV3_JVXIZDzlZIjsnNTCUGvk0D2poTIg0Kjr_hqkaQ",
						"e": "AQAB"
					}
				]
			}
		);
	}
}
