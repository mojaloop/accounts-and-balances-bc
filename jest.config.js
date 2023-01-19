"use strict";

const config = {
	preset: "ts-jest",
	testMatch: ["**/test/integration/**/*.test.ts"],
	clearMocks: true,
	collectCoverage: false,
	collectCoverageFrom: ["packages/*/src/**/*.ts"],
	coveragePathIgnorePatterns: [],
	coverageDirectory: "coverage/integration",
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
