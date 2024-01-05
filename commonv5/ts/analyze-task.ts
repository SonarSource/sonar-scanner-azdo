import * as tl from "azure-pipelines-task-lib/task";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { sanitizeScannerParams, stringifyScannerParams } from "./helpers/utils";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";
import { TASK_MISSING_VARIABLE_ERROR_HINT, TaskVariables } from "./helpers/constants";

export default async function analyzeTask(
  rootPath: string,
  jdkVersionSource: string,
  isSonarCloud: boolean = false,
) {
  if (typeof tl.getVariable(TaskVariables.SonarQubeScannerMode) === "undefined") {
    tl.setResult(
      tl.TaskResult.Failed,
      `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
    );
    return;
  }

  // Run scanner
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable(TaskVariables.SonarQubeScannerMode)];
  Scanner.setIsSonarCloud(isSonarCloud);
  JavaVersionResolver.setJavaVersion(jdkVersionSource);
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
