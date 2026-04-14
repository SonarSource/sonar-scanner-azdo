/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { EndpointType } from "../Endpoint";
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
  projectName: undefined,
  metrics: MOCKED_METRICS,
  warnings: [],
};

jest.mock("azure-pipelines-task-lib/task", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  getHttpProxyConfiguration: jest.fn().mockImplementation(() => null),
}));

it("should generate an analysis status with error", () => {
  const analysis = new HtmlAnalysisReport(
    EndpointType.Server,
    MOCKED_PROJECT_STATUS_ERROR,
    [],
    MOCKED_ANALYSIS_RESULT,
  );

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it("should not fail when metrics are missing", () => {
  const analysis = new HtmlAnalysisReport(EndpointType.Server, MOCKED_PROJECT_STATUS_ERROR, [], {
    ...MOCKED_ANALYSIS_RESULT,
    dashboardUrl: undefined,
    metrics: undefined,
  });

  expect(analysis.getFailedConditions()).toHaveLength(1);
  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});

it.each([[EndpointType.Server], [EndpointType.Cloud]])(
  "should render passing quality gate measures correctly",
  (endpointType) => {
    const analysis = new HtmlAnalysisReport(
      endpointType,
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
  },
);

it("should display the project name", () => {
  const analysis = new HtmlAnalysisReport(EndpointType.Server, MOCKED_PROJECT_STATUS_ERROR, [], {
    ...MOCKED_ANALYSIS_RESULT,
    projectName: "project_name",
  });

  expect(analysis.getHtmlAnalysisReport()).toMatchSnapshot();
});
