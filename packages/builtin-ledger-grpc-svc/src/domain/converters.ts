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

const REGEX: RegExp = /^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/;

// Can be optimized.
export function stringToBigint(stringValue: string, decimals: number): bigint {
	if (!REGEX.test(stringValue)) {
		throw new Error("stringToBigint() - regex test failed, invalid input stringValue");
	}

	// Count the decimals on the received string.
	const stringValueSplitted: string[] = stringValue.split(".");
	const existingDecimals: number = stringValueSplitted[1]?.length ?? 0;
	if (existingDecimals > decimals) {
		throw new Error("stringToBigint() - existingDecimals > decimals");
	}

	// Format the received string according to the decimals.
	const stringValueFormatted: string =
		stringValue.replace(".", "")
		+ "0".repeat(decimals - existingDecimals);

	const bigintValue: bigint = BigInt(stringValueFormatted);
	return bigintValue;
}

// Can be optimized.
export function bigintToString(bigintValue: bigint, decimals: number): string {
	if (bigintValue === 0n) {
		return "0";
	}

	// Get the string corresponding to the bigint and insert a dot according to the decimals.
	const bigintValueToString: string = bigintValue.toString();
	const dotIdx: number = bigintValueToString.length - decimals;
	const bigintValueToStringWithDot: string =
		bigintValueToString.slice(0, dotIdx) + "." + bigintValueToString.slice(dotIdx);

	let finalString: string = bigintValueToStringWithDot;
	// Remove trailing zeros, if necessary.
	while (finalString.endsWith("0")) {
		finalString = finalString.slice(0, -1);
	}
	// Remove dot, if necessary.
	if (finalString.endsWith(".")) {
		finalString = finalString.slice(0, -1);
	}

	return finalString;
}
