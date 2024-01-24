import HtmlAnalysisReport from "../HtmlAnalysisReport";
import { AnalysisResult, Metric } from "../types";

const MOCKED_METRICS: Metric[] = [{ key: "bugs", name: "Bugs", type: "INT" }];
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
  status: "OK",
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
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_ERROR, MOCKED_ANALYSIS_RESULT);

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should generate a green analysis status", () => {
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_SUCCESS, MOCKED_ANALYSIS_RESULT);

  expect(analysis.getFailedConditions()).toHaveLength(0);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should not fail when metrics are missing", () => {
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_ERROR, {
    ...MOCKED_ANALYSIS_RESULT,
    dashboardUrl: undefined,
    metrics: undefined,
  });

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should display the project name", () => {
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_ERROR, {
    ...MOCKED_ANALYSIS_RESULT,
    projectName: "project_name",
  });

  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});
