"use strict";

const fullPackageName = require("./package.json").name;
const shortPackageName = fullPackageName.replace("@mojaloop/accounts-and-balances-bc-", "");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["./src/**/*.ts"],
  coverageReporters: ["json", "lcov"],
  coverageDirectory: `../../coverage/${shortPackageName}/`,
  clearMocks: true,
  coverageThreshold: {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": -10
    }
  }
}
