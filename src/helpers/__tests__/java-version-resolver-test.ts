import * as tl from "azure-pipelines-task-lib/task";
import JavaVersionResolver from "../java-version-resolver";
import { TaskVariables } from "../constants";

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("setJavaVersion", () => {
  it("java_home set in task configuration, should do nothing", () => {
    const expectedJavaPath = "/opt/bin/java/bin";
    const jdkSource = "JAVA_HOME";
    jest.spyOn(tl, "getInput").mockReturnValueOnce(jdkSource);

    jest.spyOn(tl, "getVariable").mockReturnValueOnce(expectedJavaPath); // JAVA_HOME

    JavaVersionResolver.setJavaVersion(jdkSource);

    const actualJavaHome = tl.getVariable(TaskVariables.JavaHome);

    expect(actualJavaHome).toBe(expectedJavaPath);
  });

  it("JAVA_HOME_11_X64 set in task configuration, should switch to it", () => {
    const java11Path = "/opt/bin/java11/bin";

    const jdkSource = "JAVA_HOME_11_X64";
    jest.spyOn(tl, "getInput").mockReturnValueOnce(jdkSource);

    jest.spyOn(tl, "getVariable").mockReturnValueOnce(java11Path); // JAVA_HOME_11_X64

    JavaVersionResolver.setJavaVersion(jdkSource);

    const actualJavaHome = tl.getVariable(TaskVariables.JavaHome);

    expect(actualJavaHome).toBe(java11Path);
  });
});

describe("lookupVariable", () => {
  it("java_home_11_x64 variable found, returning it", () => {
    const javaHome11X64Value = "/opt/bin/java11/bin";
    const jdkSource = "JAVA_HOME_11_X64";

    jest.spyOn(tl, "getVariable").mockReturnValueOnce(javaHome11X64Value); // JAVA_HOME_11_X64

    const actualJavaPath = JavaVersionResolver.lookupVariable(jdkSource);

    expect(actualJavaPath).toBe(javaHome11X64Value);
  });

  it("variable wanted not found, returning undefined", () => {
    const jdkSource = "JAVA_HOME_11_X64";

    jest.spyOn(tl, "getVariable").mockReturnValueOnce(undefined); // JAVA_HOME_11_X64

    const actualJavaPath = JavaVersionResolver.lookupVariable(jdkSource);

    expect(actualJavaPath).toBe(undefined);
  });
});
