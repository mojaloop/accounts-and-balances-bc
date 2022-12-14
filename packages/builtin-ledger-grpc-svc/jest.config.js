"use strict";

const fullPackageName = require("./package.json").name;
const shortPackageName = fullPackageName.replace("@mojaloop/accounts-and-balances-bc-", "");

const config = {
	preset: "ts-jest",
	clearMocks: true,
	testMatch: ["**/test/unit/**/*.test.ts"],
	collectCoverage: true,
	collectCoverageFrom: ["./src/domain/**/*.ts"],
	coverageDirectory: `../../coverage/unit/${shortPackageName}/`,
	coveragePathIgnorePatterns: [/*"./src/application/index.ts", "./src/application/builtin_ledger_grpc_service.ts", */"./src/domain/errors.ts"/*, "./src/implementations/"*/],
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
