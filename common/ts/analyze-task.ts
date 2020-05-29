import * as tl from "azure-pipelines-task-lib/task";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";

export default async function analyzeTask(rootPath: string, isSonarCloud: boolean = false) {
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable("SONARQUBE_SCANNER_MODE")];
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
    );
  }
  Scanner.setIsSonarCloud(isSonarCloud);
  const originalJavaHome = tl.getVariable("JAVA_HOME");
  const java11Path = tl.getVariable("JAVA_HOME_11_X64");
  let hasTurnedToJava11 = false;
  if (java11Path) {
    tl.debug("Java 11 path has been detected, switching to it for the analysis.");
    tl.setVariable("JAVA_HOME", java11Path);
    hasTurnedToJava11 = true;
  }
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  await scanner.runAnalysis();
  if (hasTurnedToJava11) {
    tl.debug("Reverting JAVA_HOME to its initial path.");
    tl.setVariable("JAVA_HOME", originalJavaHome);
  }
}
