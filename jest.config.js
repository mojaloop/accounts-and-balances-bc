"use strict";

const config = {
	preset: "ts-jest",
	clearMocks: true,
	testMatch: ["<rootDir>/test/integration/**/*.test.ts"],
	collectCoverage: true,
	collectCoverageFrom: ["./packages/**/src/**/*.ts"],
	coverageDirectory: "./coverage/integration/",
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
