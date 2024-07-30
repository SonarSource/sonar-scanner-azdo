import * as tl from "azure-pipelines-task-lib/task";
import { analyzeTask } from "../analyze-task";
import { JdkVersionSource, TASK_MISSING_VARIABLE_ERROR_HINT } from "../helpers/constants";
import { EndpointType } from "../sonarqube";
import Scanner, { ScannerCLI } from "../sonarqube/Scanner";

it("should not have SONAR_SCANNER_MODE property filled", async () => {
  jest.spyOn(tl, "getVariable").mockImplementation(() => undefined);
  jest.spyOn(tl, "setResult").mockImplementation(() => null);
  jest.spyOn(tl, "getInput").mockImplementation(() => JdkVersionSource.JavaHome);

  await analyzeTask(EndpointType.SonarQube);

  expect(tl.setResult).toHaveBeenCalledWith(
    tl.TaskResult.Failed,
    `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
  );
});

it("should run scanner", async () => {
  //SONAR_SERVER_VERSION
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("9.9.0.213");

  //SONAR_SCANNER_MODE
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("CLI");
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("CLI");

  //SONAR_SCANNER_PARAMS
  jest
    .spyOn(tl, "getVariable")
    .mockReturnValueOnce('{"sonar.metadata": "/home/user/metadata.txt"}');

  //JAVA_HOME
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("/home/path/to/java");

  //JAVA_HOME_11_X64
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("/home/path/to/java");

  const scanner = new ScannerCLI(__dirname, { projectSettings: "scanner.properties" });

  jest.spyOn(Scanner, "getAnalyzeScanner").mockImplementation(() => scanner);

  //SONAR_SCANNER_PARAMS
  jest
    .spyOn(tl, "getVariable")
    .mockReturnValueOnce('{"sonar.metadata": "/home/user/metadata.txt"}');

  //SONAR_ENDPOINT
  jest
    .spyOn(tl, "getVariable")
    .mockReturnValueOnce(
      '{"type":"SonarQube","data":{"url":"https://sonarqube.com/","username":"token"}}',
    );

  jest.spyOn(scanner, "runAnalysis").mockImplementation(() => null);

  await analyzeTask(EndpointType.SonarCloud);

  expect(Scanner.getAnalyzeScanner).toHaveBeenCalled();

  expect(scanner.runAnalysis).toHaveBeenCalled();
});
