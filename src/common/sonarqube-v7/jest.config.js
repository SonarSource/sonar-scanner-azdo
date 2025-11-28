const path = require("path");

const esModules = ["node-fetch", "data-uri-to-buffer", "fetch-blob", "formdata-polyfill"].join("|");

module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageReporters: [
    ["lcovonly", { projectRoot: path.join(__dirname, "..", "..", "..") }],
    "text",
  ],
  moduleFileExtensions: ["ts", "js"],
  testPathIgnorePatterns: ["<rootDir>/node_modules", "<rootDir>/config", "<rootDir>/build"],
  testRegex: "(/__tests__/.*-test)\\.ts$",
  testEnvironmentOptions: {
    url: "http://localhost/",
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  transform: {
    ".(ts)$": ["ts-jest"],
    ".(js)$": ["babel-jest"],
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
};
