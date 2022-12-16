"use strict";

const fullPackageName = require("./package.json").name;
const shortPackageName = fullPackageName.replace("@mojaloop/accounts-and-balances-bc-", "");

const config = {
	preset: "ts-jest",
	clearMocks: true,
	testMatch: ["**/test/unit/**/*.test.ts"],
	collectCoverage: true,
	collectCoverageFrom: ["./src/**/*.ts"],
	coveragePathIgnorePatterns: ["./src/implementations/"],
	coverageDirectory: `../../coverage/unit/${shortPackageName}/`,
	coverageReporters: ["text", "lcov"],
	coverageThreshold: {
		"global": {
			"branches": 90,
			"functions": 90,
			"lines": 90,
			"statements": -10
		}
	}
};

module.exports = config;
