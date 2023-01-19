"use strict";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {name: fullPackageName} = require("./package.json");

const abbreviatedPackageName = fullPackageName.replace("@mojaloop/accounts-and-balances-bc-", "");

const config = {
	preset: "ts-jest",
	testMatch: ["**/test/unit/**/*.test.ts"],
	clearMocks: true,
	collectCoverage: true,
	collectCoverageFrom: ["src/**/*.ts"],
	coveragePathIgnorePatterns: [
		"src/index.ts",
		"src/application/index.ts",
		"src/application/grpc_svc.ts",
		"src/application/grpc_server/grpc_handlers.ts",
		"src/domain/errors.ts",
		"src/implementations"
	],
	coverageDirectory: `../../coverage/unit/${abbreviatedPackageName}`,
	coverageReporters: ["text", "lcov"],
	coverageThreshold: {
		global: {
			branches: 90,
			functions: 90,
			lines: 90,
			statements: -10
		}
	}
};

module.exports = config;
