import * as tl from "azure-pipelines-task-lib/task";
import JavaVersionResolver from "../java-version-resolver";

beforeEach(() => {
  jest.restoreAllMocks();
});

it("should return latest java version available", () => {
  const expectedJavaPath = "/opt/bin/java/bin";

  jest.spyOn(tl, "getVariable").mockReturnValueOnce(expectedJavaPath); // JAVA_HOME_17_X64

  const actualJavaPath = JavaVersionResolver.lookupLatestAvailableJavaVersion();

  expect(actualJavaPath).toBe(expectedJavaPath);
});

it("last version doesn't exist, return another one", () => {
  const expectedJavaPath = "/opt/bin/java/bin";

  jest.spyOn(tl, "getVariable").mockReturnValueOnce(undefined); // JAVA_HOME_17_X64
  jest.spyOn(tl, "getVariable").mockReturnValueOnce(expectedJavaPath); // JAVA_HOME_11_X64

  const actualJavaPath = JavaVersionResolver.lookupLatestAvailableJavaVersion();

  expect(actualJavaPath).toBe(expectedJavaPath);
});

it("No specific version found, return NOTFOUND", () => {
  jest.spyOn(tl, "getVariable").mockReturnValue(undefined); // all of the array

  const actualJavaPath = JavaVersionResolver.lookupLatestAvailableJavaVersion();

  expect(actualJavaPath).toBe("NOTFOUND");
});

it("Should set JAVA_HOME to value found for JAVA_HOME_17_X64", () => {
  const expectedJavaPath = "/opt/bin/java/bin";

  jest.spyOn(tl, "getVariable").mockReturnValueOnce(expectedJavaPath); // JAVA_HOME_17_X64

  JavaVersionResolver.setJavaHomeToIfAvailable();

  const actualJavaHome = tl.getVariable("JAVA_HOME");

  expect(actualJavaHome).toBe(expectedJavaPath);
});

it("Should let JAVA_HOME with its original value", () => {
  const expectedJavaPath = tl.getVariable("JAVA_HOME");

  jest.spyOn(tl, "getVariable").mockReturnValueOnce(undefined); // JAVA_HOME_17_X64
  jest.spyOn(tl, "getVariable").mockReturnValueOnce(undefined); // JAVA_HOME_11_X64

  JavaVersionResolver.setJavaHomeToIfAvailable();

  const actualJavaHome = tl.getVariable("JAVA_HOME");

  expect(actualJavaHome).toBe(expectedJavaPath);
});

it("JAVA_HOME overriden, should be back to its default value", () => {
  const originalJavaPath = tl.getVariable("JAVA_HOME");
  const javaPathForReplace = "/opt/bin/java/bin";

  jest.spyOn(tl, "getVariable").mockReturnValueOnce(javaPathForReplace); // JAVA_HOME_17_X64

  JavaVersionResolver.setJavaHomeToIfAvailable();

  //Intermediate sanity check to verify that the value was well overriden
  expect(tl.getVariable("JAVA_HOME")).toBe(javaPathForReplace);

  JavaVersionResolver.revertJavaHomeToOriginal();

  const actualJavaHome = tl.getVariable("JAVA_HOME");

  expect(actualJavaHome).toBe(originalJavaPath);
});
