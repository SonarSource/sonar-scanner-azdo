import HtmlAnalysisReport from "../HtmlAnalysisReport";
import { AnalysisResult, Metric } from "../types";

const MOCKED_METRICS: Metric[] = [{ key: "new_violations", name: "Bugs", type: "INT" }];
const MOCKED_PROJECT_STATUS_ERROR = {
  status: "ERROR",
  conditions: [
    {
      status: "ERROR",
      metricKey: "new_violations",
      comparator: "GT",
      errorThreshold: "0",
      actualValue: "1",
    },
  ],
};
const MOCKED_PROJECT_STATUS_SUCCESS = {
  status: "OK",
  conditions: [
    {
      status: "OK",
      metricKey: "new_violations",
      comparator: "GT",
      errorThreshold: "0",
      actualValue: "0",
    },
  ],
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
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_ERROR, [], MOCKED_ANALYSIS_RESULT);

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should not fail when metrics are missing", () => {
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_ERROR, [], {
    ...MOCKED_ANALYSIS_RESULT,
    dashboardUrl: undefined,
    metrics: undefined,
  });

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should render passing quality gate measures correctly", () => {
  const analysis = new HtmlAnalysisReport(
    MOCKED_PROJECT_STATUS_SUCCESS,
    [
      {
        metric: "new_violations",
        value: "1",
      },
      {
        metric: "pull_request_fixed_issues",
        period: {
          value: "2",
          index: 1,
        },
      },
      {
        metric: "new_coverage",
        value: "23",
      },
    ],
    MOCKED_ANALYSIS_RESULT,
  );

  expect(analysis.getFailedConditions()).toHaveLength(0);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should display the project name", () => {
  const analysis = new HtmlAnalysisReport(MOCKED_PROJECT_STATUS_ERROR, [], {
    ...MOCKED_ANALYSIS_RESULT,
    projectName: "project_name",
  });

  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});
