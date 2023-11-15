import * as tl from "azure-pipelines-task-lib/task";
import analyzeTask from "../../ts/analyze-task";
import Scanner, { ScannerCLI, ScannerMode } from "../sonarqube/Scanner";
import { TASK_MISSING_VARIABLE_ERROR_HINT } from "../helpers/constants";

it("should not have SONARQUBE_SCANNER_MODE property filled", async () => {
  jest.spyOn(tl, "getVariable").mockImplementation(() => undefined);
  jest.spyOn(tl, "setResult").mockImplementation(() => null);

  await analyzeTask(__dirname, "JAVA_HOME");

  expect(tl.setResult).toHaveBeenCalledWith(
    tl.TaskResult.Failed,
    `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
  );
});

it("should run scanner", async () => {
  //SONARQUBE_SCANNER_MODE
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("CLI");
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("CLI");

  //JAVA_HOME
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("/home/path/to/java");

  //JAVA_HOME_11_X64
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("/home/path/to/java");

  const scanner = new ScannerCLI(__dirname, { projectSettings: "scanner.properties" });

  jest.spyOn(Scanner, "getAnalyzeScanner").mockImplementation(() => scanner);

  //SONARQUBE_SCANNER_PARAMS
  jest
    .spyOn(tl, "getVariable")
    .mockReturnValueOnce('{"sonar.metadata": "/home/user/metadata.txt"}');

  //SONARQUBE_ENDPOINT
  jest
    .spyOn(tl, "getVariable")
    .mockReturnValueOnce(
      '{"type":"SonarQube","data":{"url":"https://sonarqube.com/","username":"token"}}',
    );

  jest.spyOn(scanner, "runAnalysis").mockImplementation(() => null);

  await analyzeTask(__dirname, "JAVA_HOME");

  expect(Scanner.getAnalyzeScanner).toHaveBeenCalledWith(__dirname, ScannerMode.CLI);

  expect(scanner.runAnalysis).toHaveBeenCalled();
});
