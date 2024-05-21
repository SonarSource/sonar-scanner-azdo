import * as tl from "azure-pipelines-task-lib/task";
import { writeFileSync } from "fs";
import * as path from "path";
import * as semver from "semver";
import { fileSync } from "tmp";
import { TaskVariables } from "../../helpers/constants";
import Endpoint, { EndpointType } from "../Endpoint";
import TaskReport from "../TaskReport";

beforeEach(() => {
  jest.restoreAllMocks();
});

it("should parse report-task.txt and preserve equals sign in url", async () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);

  const tmpReport = fileSync();
  writeFileSync(
    tmpReport.fd,
    `dashboardUrl=http://sonar/bar?toto=titi&foo=%2Esomething
projectKey=myProjectKey
ceTaskId=12345
serverUrl=http://sonar`,
    {
      encoding: "utf-8",
    },
  );

  const endpoint = new Endpoint(EndpointType.SonarCloud, null);

  const reports = await TaskReport.createTaskReportsFromFiles(
    endpoint,
    new semver.SemVer("7.2.0"),
    [tmpReport.name],
  );

  expect(reports).toHaveLength(1);
  const report = reports[0];
  expect(report.dashboardUrl).toBe("http://sonar/bar?toto=titi&foo=%2Esomething");

  tmpReport.removeCallback();
});

it("should parse all reports", async () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);

  const tmpReport = fileSync();
  writeFileSync(
    tmpReport.fd,
    `dashboardUrl=http://sonar/bar?toto=titi&foo=%2Esomething
projectKey=projectKey1
ceTaskId=12345
serverUrl=http://sonar`,
    {
      encoding: "utf-8",
    },
  );

  const tmpReport2 = fileSync();
  writeFileSync(
    tmpReport2.fd,
    `dashboardUrl=http://sonar/bar?toto=titi&foo=%2Esomething
projectKey=projectKey2
ceTaskId=12345
serverUrl=http://sonar`,
    {
      encoding: "utf-8",
    },
  );

  const endpoint = new Endpoint(EndpointType.SonarCloud, null);

  const reports = await TaskReport.createTaskReportsFromFiles(
    endpoint,
    new semver.SemVer("7.2.0"),
    [tmpReport.name, tmpReport2.name],
  );

  expect(reports).toHaveLength(2);
  expect(reports[0].projectKey).toBe("projectKey1");
  expect(reports[1].projectKey).toBe("projectKey2");

  tmpReport.removeCallback();
  tmpReport2.removeCallback();
});

it.each([
  [EndpointType.SonarQube, "7.2.0"],
  [EndpointType.SonarQube, "10.0.0"],
  [EndpointType.SonarQube, "20.0.0"],
  [EndpointType.SonarCloud, "7.2.0"],
  [EndpointType.SonarCloud, "10.0.0"],
  [EndpointType.SonarCloud, "20.0.0"],
])("should find report files for %p", (endpointType, version) => {
  // using spyOn so we can reset the original behaviour
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  jest.spyOn(tl, "getVariable").mockImplementation(() => "mock report task file path");
  jest.spyOn(tl, "find").mockImplementation(() => ["path1", "path2"]);

  const endpoint = new Endpoint(endpointType, null);

  const reportFiles = TaskReport.findTaskFileReport(endpoint, new semver.SemVer(version));

  expect(reportFiles.length).toBe(2);
  expect(reportFiles[0]).toBe("path1");
  expect(reportFiles[1]).toBe("path2");

  expect(tl.getVariable).toHaveBeenCalledTimes(2);
  expect(tl.getVariable).toHaveBeenCalledWith(TaskVariables.SonarQubeScannerReportTaskFile);

  // Calculate the expected path to take account of different
  // path separators in Windows/non-Windows
  expect(tl.find).toHaveBeenCalledTimes(1);
  expect(tl.find).toHaveBeenCalledWith("mock report task file path");
});

it("should find report files for SonarQube below 7.2.0", () => {
  // using spyOn so we can reset the original behaviour
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  jest.spyOn(tl, "getVariable").mockImplementation(() => "mock root search path");
  jest.spyOn(tl, "findMatch").mockImplementation(() => ["path1", "path2"]);

  const endpoint = new Endpoint(EndpointType.SonarQube, null);

  const reportFiles = TaskReport.findTaskFileReport(endpoint, new semver.SemVer("7.0.0"));

  expect(reportFiles.length).toBe(2);
  expect(reportFiles[0]).toBe("path1");
  expect(reportFiles[1]).toBe("path2");

  expect(tl.getVariable).toHaveBeenCalledTimes(1);
  expect(tl.getVariable).toBeCalledWith("Agent.BuildDirectory");

  // Calculate the expected path to take account of different
  // path separators in Windows/non-Windows
  const expectedSearchPath = path.join("**", "report-task.txt");

  expect(tl.findMatch).toHaveBeenCalledTimes(1);
  expect(tl.findMatch).toHaveBeenCalledWith("mock root search path", expectedSearchPath);
});
