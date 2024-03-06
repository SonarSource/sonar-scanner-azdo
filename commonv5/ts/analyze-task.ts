import * as tl from "azure-pipelines-task-lib/task";
import {
  JdkVersionSource,
  TASK_MISSING_VARIABLE_ERROR_HINT,
  TaskVariables,
} from "./helpers/constants";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { sanitizeScannerParams, stringifyScannerParams } from "./helpers/utils";
import { EndpointType } from "./sonarqube/Endpoint";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";

export default async function analyzeTask(
  rootPath: string,
  jdkVersionSource: JdkVersionSource,
  isSonarCloud: boolean = false,
) {
  if (typeof tl.getVariable(TaskVariables.SonarQubeScannerMode) === "undefined") {
    tl.setResult(
      tl.TaskResult.Failed,
      `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
    );
    return;
  }

  Scanner.setIsSonarCloud(isSonarCloud);
  const serverVersion = tl.getVariable(TaskVariables.SonarQubeServerVersion);
  JavaVersionResolver.setJavaVersion(
    jdkVersionSource,
    isSonarCloud ? EndpointType.SonarCloud : EndpointType.SonarQube,
    serverVersion,
  );

  // Run scanner
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable(TaskVariables.SonarQubeScannerMode)];
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  const sqScannerParams = JSON.parse(tl.getVariable(TaskVariables.SonarQubeScannerParams));
  await scanner.runAnalysis();

  // Sanitize scanner params (SSF-194)
  tl.setVariable(
    TaskVariables.SonarQubeScannerParams,
    stringifyScannerParams(sanitizeScannerParams(sqScannerParams)),
  );

  JavaVersionResolver.revertJavaHomeToOriginal();
}
