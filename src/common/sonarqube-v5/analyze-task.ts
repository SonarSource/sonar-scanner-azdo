import * as tl from "azure-pipelines-task-lib";
import {
  DEPRECATION_MESSAGE,
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

  tl.warning(DEPRECATION_MESSAGE);

  if (typeof tl.getVariable(TaskVariables.SonarQubeScannerMode) === "undefined") {
    tl.setResult(
      tl.TaskResult.Failed,
      `Variables are missing. Please make sure that you are running the Prepare task before running the Analyze task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
    );
    return;
  }

  Scanner.setIsSonarCloud(endpointType === EndpointType.SonarCloud);
  const serverVersion = tl.getVariable(TaskVariables.SonarQubeServerVersion);
  JavaVersionResolver.setJavaVersion(jdkVersionSource, endpointType, serverVersion);

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
};
