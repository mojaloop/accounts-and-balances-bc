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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

import {bigintToString,stringToBigint} from "../../src/domain/converters";

describe("number converter - stringToBigint", ()=>{

	test("stringToBigint() - '0.02', 1 decimals - cannot have less decimals than provided number - should throw", async () => {
		expect(() => {
			stringToBigint("0.02", 1)
		}).toThrow();
	});

	test("stringToBigint() - '0.02', 2 decimals", async () => {
		expect(stringToBigint("0.02", 2)).toEqual(2n);
	});

	test("stringToBigint() - '0.2', 2 decimals", async () => {
		expect(stringToBigint("0.2", 2)).toEqual(20n);
	});

	test("stringToBigint() - '2', 2 decimals", async () => {
		expect(stringToBigint("2", 2)).toEqual(200n);
	});

	test("stringToBigint() - '20', 2 decimals", async () => {
		expect(stringToBigint("20", 2)).toEqual(2000n);
	});

    test("stringToBigint() - '20000', 2 decimals", async () => {
        expect(stringToBigint("20000", 2)).toEqual(2000000n);
    });

    test("stringToBigint() - '25.01', 4 decimals", async () => {
        expect(stringToBigint("25.01", 4)).toEqual(250100n);
    });

    test("stringToBigint() - negative '-20', 2 decimals", async () => {
		expect(stringToBigint("-20", 2)).toEqual(-2000n);
	});

    test("stringToBigint() - negative '-20', 0 decimals", async () => {
        expect(stringToBigint("-20", 0)).toEqual(-20n);
    });

    test("stringToBigint() - negative '25.01', 4 decimals", async () => {
        expect(stringToBigint("-25.01", 4)).toEqual(-250100n);
    });
});

describe("number converter - bigintToString", () => {
	test("bigintToString() - 2n, 0 decimals", async () => {
		expect(bigintToString(2n, 0)).toEqual("2");
	});

	test("bigintToString() - 2n, 1 decimals", async () => {
		expect(bigintToString(2n, 1)).toEqual("0.2");
	});

	test("bigintToString() - 2n, 2 decimals", async () => {
		expect(bigintToString(2n, 2)).toEqual("0.02");
	});

	test("bigintToString() - 20n, 2 decimals", async () => {
		expect(bigintToString(20n, 2)).toEqual("0.2");
	});

    test("bigintToString() - 200n, 2 decimals", async () => {
        expect(bigintToString(200n, 2)).toEqual("2");
    });

	test("bigintToString() - negative -20n, 2 decimals", async () => {
		expect(bigintToString(-20n, 2)).toEqual("-0.2");
	});

    test("bigintToString() - negative -2n, 2 decimals", async () => {
        expect(bigintToString(-2n, 2)).toEqual("-0.02");
    });
});
