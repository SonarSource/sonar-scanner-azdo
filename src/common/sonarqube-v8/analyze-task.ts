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
import {
  JdkVersionSource,
  TASK_MISSING_VARIABLE_ERROR_HINT,
  TaskVariables,
} from "./helpers/constants";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { sanitizeScannerParams, stringifyScannerParams } from "./helpers/utils";
import { TaskJob } from "./run";
import { EndpointType } from "./sonarqube/Endpoint";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";

export const analyzeTask: TaskJob = async (endpointType: EndpointType) => {
  const rootPath = __dirname;
  const jdkVersionSource = tl.getInput("jdkversion", true) as JdkVersionSource;

  if (typeof tl.getVariable(TaskVariables.SonarScannerMode) === "undefined") {
    tl.setResult(
      tl.TaskResult.Failed,
      `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
    );
    return;
  }

  Scanner.setIsSonarCloud(endpointType === EndpointType.Cloud);
  const serverVersion = tl.getVariable(TaskVariables.SonarServerVersion);
  JavaVersionResolver.setJavaVersion(jdkVersionSource, endpointType, serverVersion);

  // Run scanner
  const scannerMode = ScannerMode[tl.getVariable(TaskVariables.SonarScannerMode) as ScannerMode];
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  const sqScannerParams = JSON.parse(tl.getVariable(TaskVariables.SonarScannerParams) as string);
  await scanner.runAnalysis();

  // Sanitize scanner params (SSF-194)
  tl.setVariable(
    TaskVariables.SonarScannerParams,
    stringifyScannerParams(sanitizeScannerParams(sqScannerParams)),
  );

  JavaVersionResolver.revertJavaHomeToOriginal();
};
