import * as tl from "azure-pipelines-task-lib/task";
import { DEPRECATION_MESSAGE } from "./helpers/constants";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { sanitizeVariable } from "./helpers/utils";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";

const JAVA_11_PATH_ENV_NAME = "JAVA_HOME_11_X64";

export default async function analyzeTask(
  rootPath: string,
  _jdkVersionSource: string = "",
  isSonarCloud: boolean = true,
) {
  const modeVar = tl.getVariable("SONARQUBE_SCANNER_MODE");
  const scannerMode: ScannerMode = modeVar ? (ScannerMode as any)[modeVar] : undefined;
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task",
    );
  }

  tl.warning(DEPRECATION_MESSAGE);

  Scanner.setIsSonarCloud(isSonarCloud);
  JavaVersionResolver.setJavaHomeToIfAvailable(JAVA_11_PATH_ENV_NAME);
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);

  // SEC-FIX: Do NOT re-inject credentials into SONARQUBE_SCANNER_PARAMS.
  // Credentials are passed via SONAR_TOKEN env var in Scanner.runAnalysis() (SEC-003).
  // Re-injecting them here duplicates secrets and risks log exposure.
  await scanner.runAnalysis();

  // Sanitize scanner params after analysis to remove any residual credential properties
  const sqScannerParams = JSON.parse(tl.getVariable("SONARQUBE_SCANNER_PARAMS") || "{}");
  tl.setVariable("SONARQUBE_SCANNER_PARAMS", sanitizeVariable(JSON.stringify(sqScannerParams)));

  JavaVersionResolver.revertJavaHomeToOriginal();
}
