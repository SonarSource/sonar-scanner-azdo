const path = require("path");

module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageReporters: [
    ["lcovonly", { projectRoot: path.join(__dirname, "..", "..", "..") }],
    "text",
  ],
  moduleFileExtensions: ["ts", "js"],
  testPathIgnorePatterns: ["<rootDir>/node_modules", "<rootDir>/config", "<rootDir>/build"],
  testRegex: "(/__tests__/.*|\\-test)\\.ts$",
  testEnvironmentOptions: {
    url: "http://localhost/",
  },
  transform: {
    ".(ts)$": "ts-jest",
  },
  globals: {
    "ts-jest": {
      tsconfig: "../../tsconfig.sonarcloud.v2.json",
    },
  },
};
