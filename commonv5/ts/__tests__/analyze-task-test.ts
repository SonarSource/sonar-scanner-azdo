import * as tl from "azure-pipelines-task-lib/task";
import * as analyze from "../../ts/analyze-task";
import Scanner, { ScannerCLI, ScannerMode } from "../sonarqube/Scanner";

it("should not have SONARQUBE_SCANNER_MODE property filled", async () => {
  jest.spyOn(tl, "getVariable").mockImplementation(() => undefined);

  const expectedError = new Error(
    "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
  );
  try {
    await analyze.default(__dirname);
  } catch (e) {
    expect(e).toEqual(expectedError);
  }
});

it("should run scanner", async () => {
  //SONARQUBE_SCANNER_MODE
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
      '{"type":"SonarQube","data":{"url":"https://sonarqube.com/","username":"token"}}'
    );

  jest.spyOn(scanner, "runAnalysis").mockImplementation(() => null);

  await analyze.default(__dirname);

  expect(Scanner.getAnalyzeScanner).toHaveBeenCalledWith(__dirname, ScannerMode.CLI);

  expect(scanner.runAnalysis).toBeCalled();
});
