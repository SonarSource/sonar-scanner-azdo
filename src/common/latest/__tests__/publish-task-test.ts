import { InvalidApiResourceVersionError } from "azure-devops-node-api/VsoClient";
import * as tl from "azure-pipelines-task-lib/task";
import * as fs from "fs-extra";
import { SemVer } from "semver";
import * as api from "../helpers/api";
import { fetchProjectStatus } from "../helpers/api";
import * as apiUtils from "../helpers/azdo-api-utils";
import * as serverUtils from "../helpers/azdo-server-utils";
import { TASK_MISSING_VARIABLE_ERROR_HINT, TaskVariables } from "../helpers/constants";
import { log, LogLevel } from "../helpers/logging";
import * as request from "../helpers/request";
import { mockTask } from "../mocks/helpers";
import * as publish from "../publish-task";
import { runTask } from "../run";
import Endpoint, { EndpointType } from "../sonarqube/Endpoint";
import HtmlAnalysisReport from "../sonarqube/HtmlAnalysisReport";
import { TimeOutReachedError, waitForTaskCompletion } from "../sonarqube/Task";
import TaskReport from "../sonarqube/TaskReport";
import { Metric, ProjectStatus } from "../sonarqube/types";

jest.mock("../helpers/logging");

jest.mock("fs-extra");

jest.mock("../sonarqube/Task", () => ({
  ...jest.requireActual("../sonarqube/Task"),
  waitForTaskCompletion: jest.fn(),
}));

beforeEach(() => {
  jest.restoreAllMocks();
});

const TASK_REPORT = new TaskReport({
  ceTaskId: "111",
  ceTaskUrl: "http://taskurl1",
  dashboardUrl: "http://dashboardurl1",
  projectKey: "projectKey1",
  serverUrl: "http:/serverUrl1",
});

const PROJECT_STATUS_OK: ProjectStatus = {
  conditions: [
    {
      metricKey: "new_coverage",
      status: "OK",
      actualValue: "100",
    },
  ],
  status: "OK",
};
const ANALYSIS_OK = new HtmlAnalysisReport(EndpointType.SonarQube, PROJECT_STATUS_OK, [], {
  warnings: [],
  dashboardUrl: "",
  metrics: null,
  projectName: null,
});

const PROJECT_STATUS_ERROR: ProjectStatus = {
  conditions: [],
  status: "ERROR",
};
const ANALYSIS_ERROR = new HtmlAnalysisReport(EndpointType.SonarQube, PROJECT_STATUS_ERROR, [], {
  warnings: [],
  dashboardUrl: "",
  metrics: null,
  projectName: null,
});

const SC_ENDPOINT = new Endpoint(EndpointType.SonarCloud, { url: "https://endpoint.url" });
const SQ_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: "https://endpoint.url" });
const METRICS: Metric[] = [
  {
    key: "new_violations",
    name: "New issues",
    type: "INT",
  },
  {
    key: "new_coverage",
    name: "Coverage on new code",
    type: "PERCENT",
  },
  {
    key: "pull_request_fixed_issues",
    name: "Issues fixed in this pull request",
    type: "INT",
  },
];

it("should fail unless SONAR_SCANNER_PARAMS are supplied", async () => {
  jest.spyOn(tl, "getVariable").mockImplementation(() => undefined);
  jest.spyOn(tl, "setResult").mockImplementation(() => null);

  await publish.publishTask(EndpointType.SonarCloud);

  expect(tl.getVariable).toHaveBeenCalledWith(TaskVariables.SonarScannerParams);
  expect(tl.setResult).toHaveBeenCalledWith(
    tl.TaskResult.Failed,
    `Variables are missing. Please make sure that you are running the Prepare and Analyze tasks before running the Publish task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
  );
});

it("check multiple report status and set global quality gate for build properties should be ok", async () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockImplementation(() => null);

  // Mock waiting for the ceTask to complete and return a Task
  const returnedTaskOk = mockTask();

  const taskReportArray: TaskReport[] = [];
  const taskReport = new TaskReport({
    ceTaskId: "string",
    ceTaskUrl: "string",
    dashboardUrl: "string",
    projectKey: "string",
    serverUrl: "string",
  });

  taskReportArray.push(taskReport);
  taskReportArray.push(taskReport);

  jest.mocked(waitForTaskCompletion).mockResolvedValue(returnedTaskOk);
  jest.spyOn(TaskReport, "createTaskReportsFromFiles").mockResolvedValue(taskReportArray);

  jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer("7.2.0"));

  jest.spyOn(api, "fetchProjectStatus").mockResolvedValue(PROJECT_STATUS_OK);
  jest.spyOn(HtmlAnalysisReport, "getInstance").mockReturnValueOnce(ANALYSIS_OK);
  jest.spyOn(api, "fetchProjectStatus").mockResolvedValue(PROJECT_STATUS_OK);
  jest.spyOn(HtmlAnalysisReport, "getInstance").mockReturnValueOnce(ANALYSIS_OK);

  jest.spyOn(api, "fetchMetrics").mockResolvedValue(METRICS);

  jest.spyOn(ANALYSIS_OK, "getHtmlAnalysisReport").mockImplementation(() => "dummy html");

  jest.spyOn(tl, "getInput").mockImplementation(() => "100");
  jest.spyOn(tl, "debug");
  jest.spyOn(tl, "command").mockImplementation(() => null);

  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => "anything...");
  jest.spyOn(tl, "getVariable").mockImplementation(() => SC_ENDPOINT.toJson());

  jest.spyOn(fs, "writeFileSync").mockImplementation(() => null);

  jest.spyOn(apiUtils, "addBuildProperty").mockResolvedValue(null);
  jest.spyOn(apiUtils, "getAuthToken").mockImplementation(() => null);

  jest.spyOn(serverUtils, "fillBuildProperty");

  await publish.publishTask(EndpointType.SonarCloud);

  expect(log).toHaveBeenCalledWith(LogLevel.INFO, `Overall Quality Gate status: ok`);
  expect(log).toHaveBeenCalledWith(LogLevel.DEBUG, `Number of analyses in this build: 2`);
  expect(serverUtils.fillBuildProperty).toHaveBeenCalledWith("sonarglobalqualitygate", "ok");
  expect(tl.command).toHaveBeenCalledWith(
    "task.addattachment",
    { type: "Distributedtask.Core.Summary", name: "SonarCloud Analysis Report" },
    expect.any(String),
  );
});

it("check multiple report status and set global quality gate for build properties should be failed", async () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockImplementation(() => null);

  // Mock waiting for the ceTask to complete and return a Task
  const returnedTaskOk = mockTask({
    analysisId: "123",
    componentKey: "key",
    status: "OK",
    type: EndpointType.SonarCloud,
    componentName: "componentName",
    warnings: [],
  });

  const taskReportArray: TaskReport[] = [];
  const taskReport = new TaskReport({
    ceTaskId: "string",
    ceTaskUrl: "string",
    dashboardUrl: "string",
    projectKey: "string",
    serverUrl: "string",
  });

  taskReportArray.push(taskReport);
  taskReportArray.push(taskReport);
  taskReportArray.push(taskReport);

  jest.mocked(waitForTaskCompletion).mockResolvedValue(returnedTaskOk);

  jest.spyOn(TaskReport, "createTaskReportsFromFiles").mockResolvedValue(taskReportArray);

  jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer("7.2.0"));

  jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_OK);
  jest.spyOn(HtmlAnalysisReport, "getInstance").mockReturnValueOnce(ANALYSIS_OK);
  jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_ERROR);
  jest.spyOn(HtmlAnalysisReport, "getInstance").mockReturnValueOnce(ANALYSIS_ERROR);
  jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_OK);
  jest.spyOn(HtmlAnalysisReport, "getInstance").mockReturnValueOnce(ANALYSIS_OK);

  jest.spyOn(api, "fetchMetrics").mockResolvedValue(METRICS);

  jest.spyOn(ANALYSIS_OK, "getHtmlAnalysisReport").mockImplementation(() => "dummy html");

  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => "anything...");
  jest.spyOn(tl, "getVariable").mockImplementation(() => SC_ENDPOINT.toJson());

  jest.spyOn(tl, "getInput").mockImplementation(() => "100");
  jest.spyOn(tl, "debug");

  jest.spyOn(apiUtils, "addBuildProperty").mockResolvedValue(null);
  jest.spyOn(apiUtils, "getAuthToken").mockImplementation(() => null);

  jest.spyOn(serverUtils, "fillBuildProperty");

  jest.spyOn(serverUtils, "publishBuildSummary").mockImplementation(() => null);

  await runTask(publish.publishTask, "Publish", EndpointType.SonarCloud);

  expect(log).toHaveBeenCalledWith(LogLevel.INFO, `Overall Quality Gate status: failed`);
  expect(log).toHaveBeenCalledWith(LogLevel.DEBUG, `Number of analyses in this build: 3`);
  expect(serverUtils.fillBuildProperty).toHaveBeenCalledWith("sonarglobalqualitygate", "failed");
});

it("get report string should return undefined if ceTask times out", async () => {
  // Mock the ceTask timing out
  jest.mocked(waitForTaskCompletion).mockImplementation(() => {
    throw new TimeOutReachedError();
  });
  jest.spyOn(api, "fetchProjectStatus");
  jest.spyOn(HtmlAnalysisReport, "getInstance");
  jest.spyOn(tl, "warning").mockImplementation(() => null);

  const result = await publish.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);

  expect(result).toBe("");
  expect(waitForTaskCompletion).toHaveBeenCalledWith(SQ_ENDPOINT, TASK_REPORT.ceTaskId, 999, 1000);
  expect(log).toHaveBeenCalledWith(
    LogLevel.WARN,
    "Task '111' takes too long to complete. Stopping after 999s of polling. No quality gate will be displayed on build result.",
  );
  expect(fetchProjectStatus).not.toHaveBeenCalled();
  expect(HtmlAnalysisReport.getInstance).not.toHaveBeenCalled();
});

it("get report string should fail for non-timeout errors", async () => {
  // Mock the ceTask timing out
  jest.mocked(waitForTaskCompletion).mockImplementation(() => {
    throw new InvalidApiResourceVersionError("my error");
  });
  jest.spyOn(HtmlAnalysisReport, "getInstance");
  jest.spyOn(tl, "warning").mockImplementation(() => null);

  expect.assertions(1);
  try {
    await publish.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);
  } catch (e) {
    expect(e).toEqual({ message: "my error", name: "Invalid resource version" });
  }
});

it("get report string for single report", async () => {
  // Mock waiting for the ceTask to complete and return a Task
  const returnedTask = mockTask({
    status: "status",
  });
  jest.mocked(waitForTaskCompletion).mockResolvedValue(returnedTask);

  jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_OK);

  jest.spyOn(HtmlAnalysisReport, "getInstance").mockReturnValueOnce(ANALYSIS_OK);
  jest.spyOn(ANALYSIS_OK, "getHtmlAnalysisReport").mockImplementation(() => "dummy html");
  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => "{}");

  const result = await publish.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);

  expect(waitForTaskCompletion).toHaveBeenCalledWith(SQ_ENDPOINT, TASK_REPORT.ceTaskId, 999, 1000);
  expect(fetchProjectStatus).toHaveBeenCalledWith(SQ_ENDPOINT, "123");

  expect(result).toBe("dummy html");
});

it("get report string should fail for non-timeout errors", async () => {
  // Mock the ceTask timing out
  jest.mocked(waitForTaskCompletion).mockImplementation(() => {
    throw new InvalidApiResourceVersionError("my error");
  });
  jest.spyOn(HtmlAnalysisReport, "getInstance");
  jest.spyOn(tl, "warning").mockImplementation(() => null);
  expect.assertions(1);
  try {
    await publish.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);
  } catch (e) {
    expect(e).toEqual({ message: "my error", name: "Invalid resource version" });
  }
});

it("task should not fail the task even if all ceTasks timeout", async () => {
  const taskReport2 = new TaskReport({
    ceTaskId: "222",
    ceTaskUrl: "http://taskurl2",
    dashboardUrl: "http://dashboardurl2",
    projectKey: "projectKey2",
    serverUrl: "http:/serverUrl2",
  });

  jest.spyOn(tl, "getInput").mockImplementation(() => "1"); // set the timeout
  jest.spyOn(tl, "setResult");
  jest.spyOn(tl, "debug").mockImplementation(() => null);
  jest.spyOn(tl, "warning").mockImplementation(() => null);

  jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer("7.2.0"));

  tl.setVariable(TaskVariables.SonarScannerParams, "anything...");
  tl.setVariable(TaskVariables.SonarEndpoint, SC_ENDPOINT.toJson());

  // Mock finding two report files to process
  jest
    .spyOn(TaskReport, "createTaskReportsFromFiles")
    .mockResolvedValue([TASK_REPORT, taskReport2]);

  jest.mocked(waitForTaskCompletion).mockImplementation(() => {
    throw new TimeOutReachedError();
  });
  const publishSummaryMock = jest
    .spyOn(serverUtils, "publishBuildSummary")
    .mockImplementation(() => null);

  jest.spyOn(api, "fetchMetrics").mockResolvedValue(METRICS);

  jest.spyOn(apiUtils, "addBuildProperty").mockImplementation(
    () =>
      new Promise((resolve) => {
        return resolve();
      }),
  );

  await runTask(publish.publishTask, "Publish", EndpointType.SonarCloud);

  expect(serverUtils.publishBuildSummary).toHaveBeenCalledTimes(1);
  expect(publishSummaryMock.mock.calls[0][1]).toBe(EndpointType.SonarCloud);
  expect(tl.setResult).not.toHaveBeenCalledWith(tl.TaskResult.Failed);

  expect(serverUtils.publishBuildSummary).toHaveBeenCalledWith("\r\n", EndpointType.SonarCloud);

  expect(log).toHaveBeenCalledWith(
    LogLevel.WARN,
    "Task '111' takes too long to complete. Stopping after 1s of polling. No quality gate will be displayed on build result.",
  );
  expect(log).toHaveBeenCalledWith(
    LogLevel.WARN,
    "Task '222' takes too long to complete. Stopping after 1s of polling. No quality gate will be displayed on build result.",
  );
});

describe("it should generate passing report correctly", () => {
  beforeEach(() => {
    tl.setVariable(TaskVariables.SonarScannerParams, "{}");
    jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer("10.4.0"));

    jest.spyOn(tl, "getInput").mockImplementation(() => "1"); // set the timeout
    jest.spyOn(tl, "setResult");
    jest.spyOn(tl, "debug").mockImplementation(() => null);
    jest.spyOn(tl, "warning").mockImplementation(() => null);

    // Mock metrics
    jest.spyOn(api, "fetchMetrics").mockResolvedValue(METRICS);

    // Mock waiting for the ceTask to complete and return a Task
    const returnedTask = mockTask({
      status: "status",
    });

    // Mock finding the report file to process
    jest.spyOn(TaskReport, "createTaskReportsFromFiles").mockResolvedValue([TASK_REPORT]);
    jest.mocked(waitForTaskCompletion).mockResolvedValue(returnedTask);

    jest.spyOn(apiUtils, "addBuildProperty").mockResolvedValue(null);
    jest.spyOn(apiUtils, "getAuthToken").mockImplementation(() => null);
    jest.spyOn(serverUtils, "fillBuildProperty").mockImplementation(() => null);
    jest.spyOn(serverUtils, "publishBuildSummary").mockImplementation(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("not fail when measures can not be retrieved", async () => {
    tl.setVariable(TaskVariables.SonarEndpoint, SQ_ENDPOINT.toJson());
    jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_OK);

    await runTask(publish.publishTask, "Publish", EndpointType.SonarCloud);

    expect(log).toHaveBeenCalledWith(
      LogLevel.DEBUG,
      "Unable to get measures. It is expected if you are not using a user token but instead a global or project analysis token.",
    );
  });

  it("should show available fetched measures", async () => {
    tl.setVariable(TaskVariables.SonarEndpoint, SQ_ENDPOINT.toJson());
    jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_OK);
    jest.spyOn(api, "fetchComponentMeasures").mockResolvedValueOnce([
      {
        metric: "new_violations",
        value: "10",
      },
    ]);

    await runTask(publish.publishTask, "Publish", EndpointType.SonarQube);

    // spy on publishBuildSummary
    expect(serverUtils.publishBuildSummary).toHaveBeenCalledTimes(1);
    const buildSummary = (serverUtils.publishBuildSummary as any).mock.calls[0][0];
    expect(buildSummary).toMatch("Quality Gate passed (componentName)");
    expect(buildSummary).toMatch("10 New issues");
    expect(buildSummary).toMatch("100% Coverage on new code");
  });

  it("should not fail when no measure/metric is available", async () => {
    tl.setVariable(TaskVariables.SonarEndpoint, SQ_ENDPOINT.toJson());
    jest
      .spyOn(api, "fetchProjectStatus")
      .mockResolvedValueOnce({ ...PROJECT_STATUS_OK, conditions: [] });
    jest.spyOn(api, "fetchComponentMeasures").mockResolvedValueOnce([]);

    await runTask(publish.publishTask, "Publish", EndpointType.SonarQube);

    // spy on publishBuildSummary
    expect(serverUtils.publishBuildSummary).toHaveBeenCalledTimes(1);
    const buildSummary = (serverUtils.publishBuildSummary as any).mock.calls[0][0];
    expect(buildSummary).toMatch("Quality Gate passed (componentName)");
  });

  it.each([
    [EndpointType.SonarQube, SQ_ENDPOINT, { "sonar.pullrequest.key": "123" }, true],
    [EndpointType.SonarQube, SQ_ENDPOINT, {}, false],
    [EndpointType.SonarQube, SQ_ENDPOINT, { "sonar.branch.name": "some-branch" }, false],
    [EndpointType.SonarCloud, SC_ENDPOINT, { "sonar.pullrequest.key": "123" }, true],
    [EndpointType.SonarCloud, SC_ENDPOINT, {}, false],
    [EndpointType.SonarCloud, SC_ENDPOINT, { "sonar.branch.name": "some-branch" }, false],
  ])(
    "should show issues fixed in pull request",
    async (endpointType, endpoint, scannerParams, shouldShow) => {
      tl.setVariable(TaskVariables.SonarEndpoint, endpoint.toJson());
      tl.setVariable(TaskVariables.SonarScannerParams, JSON.stringify(scannerParams));
      jest.spyOn(api, "fetchProjectStatus").mockResolvedValueOnce(PROJECT_STATUS_OK);
      jest.spyOn(api, "fetchComponentMeasures").mockImplementation((_endpoint, { metricKeys }) => {
        return Promise.resolve(
          metricKeys.split(",").map((metricKey) => {
            return {
              metric: metricKey,
              value: "32",
            };
          }),
        );
      });

      await runTask(publish.publishTask, "Publish", endpointType);

      // Check build summary
      expect(serverUtils.publishBuildSummary).toHaveBeenCalledTimes(1);
      const buildSummary = (serverUtils.publishBuildSummary as any).mock.calls[0][0];
      if (shouldShow) {
        expect(buildSummary).toMatch("32 Fixed issues");
      } else {
        expect(buildSummary).not.toMatch("32 Fixed issues");
      }
    },
  );
});
