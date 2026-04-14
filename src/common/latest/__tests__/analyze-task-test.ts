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

import * as tl from "azure-pipelines-task-lib/task";
import { analyzeTask } from "../analyze-task";
import {
  JdkVersionSource,
  TASK_MISSING_VARIABLE_ERROR_HINT,
  TaskVariables,
} from "../helpers/constants";
import { AzureTaskLibMock } from "../mocks/AzureTaskLibMock";
import { EndpointType } from "../sonarqube";
import Scanner, { ScannerCLI, ScannerMode } from "../sonarqube/Scanner";

jest.mock("azure-pipelines-task-lib/task");

const azureTaskLibMock = new AzureTaskLibMock();

beforeEach(() => {
  jest.restoreAllMocks();
  azureTaskLibMock.reset();
});

it("should not have SONAR_SCANNER_MODE property filled", async () => {
  azureTaskLibMock.setVariables({
    [TaskVariables.JavaHome]: "/home/path/to/java",
  });
  azureTaskLibMock.setInputs({
    jdkversion: JdkVersionSource.JavaHome,
  });

  await analyzeTask(EndpointType.Server);

  expect(azureTaskLibMock.getResult()).toEqual({
    result: tl.TaskResult.Failed,
    message: `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
  });
});

it("should run scanner", async () => {
  azureTaskLibMock.setVariables({
    [TaskVariables.SonarServerVersion]: "9.9.0.213",
    [TaskVariables.SonarScannerMode]: ScannerMode.cli,
    [TaskVariables.SonarScannerParams]: '{"sonar.metadata": "/home/user/metadata.txt"}',
    [TaskVariables.SonarEndpoint]:
      '{"type":"SonarQube","data":{"url":"https://sonarqube.com/","username":"token"}}',
    [TaskVariables.JavaHome]: "/home/path/to/java",
    JAVA_HOME_11_X64: "/home/path/to/java",
  });
  azureTaskLibMock.setInputs({
    jdkversion: JdkVersionSource.JavaHome,
  });

  const scanner = new ScannerCLI(__dirname, { projectSettings: "scanner.properties" });

  jest.spyOn(Scanner, "getAnalyzeScanner").mockImplementation(() => scanner);

  jest.spyOn(scanner, "runAnalysis").mockResolvedValue();

  await analyzeTask(EndpointType.Cloud);

  expect(Scanner.getAnalyzeScanner).toHaveBeenCalled();

  expect(scanner.runAnalysis).toHaveBeenCalled();
});
