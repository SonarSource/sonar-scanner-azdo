import Analysis from "../Analysis";
import Endpoint, { EndpointType } from "../Endpoint";
import Metrics from "../Metrics";
import { AnalysisResult } from "../types";

const MOCKED_METRICS = new Metrics([{ key: "bugs", name: "Bugs", type: "INT" }]);
const MOCKED_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: "https://endpoint.url" });
const MOCKED_PROJECT_STATUS_ERROR = {
  status: "ERROR",
  conditions: [
    {
      status: "ERROR",
      metricKey: "bugs",
      comparator: "GT",
      errorThreshold: "0",
      actualValue: "1",
    },
  ],
};
const MOCKED_PROJECT_STATUS_SUCCESS = {
  status: "SUCCESS",
  conditions: [],
};
const MOCKED_ANALYSIS_RESULT: AnalysisResult = {
  dashboardUrl: "https://dashboard.url",
  projectName: null,
  metrics: MOCKED_METRICS,
  warnings: [],
};

jest.mock("azure-pipelines-task-lib/task", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  getHttpProxyConfiguration: jest.fn().mockImplementation(() => null),
}));

it("should generate an analysis status with error", () => {
  const analysis = new Analysis(
    MOCKED_ENDPOINT.type,
    MOCKED_PROJECT_STATUS_ERROR,
    MOCKED_ANALYSIS_RESULT,
  );

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should generate a green analysis status", () => {
  const analysis = new Analysis(
    MOCKED_ENDPOINT.type,
    MOCKED_PROJECT_STATUS_SUCCESS,
    MOCKED_ANALYSIS_RESULT,
  );

  expect(analysis.getFailedConditions()).toHaveLength(0);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should not fail when metrics are missing", () => {
  const analysis = new Analysis(MOCKED_ENDPOINT.type, MOCKED_PROJECT_STATUS_ERROR, {
    ...MOCKED_ANALYSIS_RESULT,
    dashboardUrl: undefined,
    metrics: undefined,
  });

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should display the project name", () => {
  const analysis = new Analysis(MOCKED_ENDPOINT.type, MOCKED_PROJECT_STATUS_ERROR, {
    ...MOCKED_ANALYSIS_RESULT,
    projectName: "project_name",
  });

  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should display Java 11 warning", () => {
  const analysis = new Analysis(MOCKED_ENDPOINT.type, MOCKED_PROJECT_STATUS_ERROR, {
    ...MOCKED_ANALYSIS_RESULT,
    warnings: [
      "The version of Java (1.8.0_221) you have used to run this analysis is deprecated and we will stop accepting it from October 2020. Please update to at least Java 11.",
    ],
  });

  expect(analysis.getHtmlWarnings()).toContain(
    "The version of Java (1.8.0_221) you have used to run this analysis is deprecated and we will stop accepting it from October 2020. Please update to at least Java 11.",
  );
});
