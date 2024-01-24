import * as tl from "azure-pipelines-task-lib/task";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { sanitizeVariable } from "./helpers/utils";
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

  const scannerMode: ScannerMode = ScannerMode[tl.getVariable(TaskVariables.SonarQubeScannerMode)];
  Scanner.setIsSonarCloud(isSonarCloud);
  JavaVersionResolver.setJavaVersion(jdkVersionSource);
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  const sqScannerParams = tl.getVariable(TaskVariables.SonarQubeScannerParams);
  await scanner.runAnalysis();
  tl.setVariable(
    TaskVariables.SonarQubeScannerParams,
    sanitizeVariable(JSON.stringify(sqScannerParams)),
  );
  JavaVersionResolver.revertJavaHomeToOriginal();
}
