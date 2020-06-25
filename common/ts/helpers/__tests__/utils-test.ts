import * as fs from "fs-extra";
import { setIfNotEmpty, toCleanJSON, getTaskVersion } from "../utils";

describe("toCleanJSON", () => {
  it("should jsonify", () => {
    expect(toCleanJSON({ foo: "a", bar: "b" })).toBe('{"foo":"a","bar":"b"}');
  });
  it("should clean the jsonified object", () => {
    expect(toCleanJSON({ foo: "a", bar: undefined, baz: "" })).toBe('{"foo":"a","baz":""}');
  });
});

describe("setIfNotEmpty", () => {
  it("should correctly set a property", () => {
    const test = {};
    setIfNotEmpty(test, "foo", "");
    expect(test).toEqual({});
    setIfNotEmpty(test, "foo", undefined);
    expect(test).toEqual({});
    setIfNotEmpty(test, "foo", "bar");
    expect(test).toEqual({ foo: "bar" });
  });
});

describe("getTaskVersion", () => {
  it("should return correct version number", () => {
    const jsonContent = `{"id": "ce096e50-6155-4de8-8800-4221aaeed4a1", "name": "SonarCloudAnalyze","friendlyName": "Run Code Analysis","description": "Run scanner and upload the results to the SonarCloud server.","helpMarkDown": "This task is not needed for Maven and Gradle projects since the scanner should be run as part of the build.[More Information](https://sonarcloud.io/documentation/analysis/scan/sonarscanner-for-azure-devops/)",    "category": "Build", "visibility": ["Build"],"author": "sonarsource", "version": { "Major": 1,   "Minor": 13, "Patch": 0 }, "minimumAgentVersion": "2.119.1", "demands": ["java"],    "inputs": [], "execution": { "Node": {"target": "analyze.js" } } }`;
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readFileSync").mockReturnValue(jsonContent);
    expect(getTaskVersion("foo")).toBe("1.13.0");
  });
  it("should return default version number if file doesn't exist", () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(getTaskVersion("foo")).toBe("1.0.0");
  });
});
