import * as tl from "azure-pipelines-task-lib/task";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { EndpointType, EndpointData } from "./sonarqube/Endpoint";
import { sanitizeVariable, PROP_NAMES } from "./helpers/utils";

const JAVA_11_PATH_ENV_NAME = "JAVA_HOME_11_X64";

export default async function analyzeTask(rootPath: string, isSonarCloud: boolean = false) {
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable("SONARQUBE_SCANNER_MODE")];
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
    );
  }
  Scanner.setIsSonarCloud(isSonarCloud);
  JavaVersionResolver.setJavaHomeToIfAvailable(JAVA_11_PATH_ENV_NAME);
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  let sqScannerParams = tl.getVariable("SONARQUBE_SCANNER_PARAMS");
  sqScannerParams = JSON.parse(sqScannerParams);

  const endpointData: { type: EndpointType; data: EndpointData } = JSON.parse(
    tl.getVariable("SONARQUBE_ENDPOINT")
  );
  if (endpointData.data.token && endpointData.data.token.length > 0) {
    sqScannerParams[PROP_NAMES.LOGIN] = endpointData.data.token;
  } else {
    sqScannerParams[PROP_NAMES.LOGIN] = endpointData.data.username;
  }
  if (endpointData.data.password && endpointData.data.password.length > 0) {
    sqScannerParams[PROP_NAMES.PASSSWORD] = endpointData.data.password;
  }
  tl.setVariable("SONARQUBE_SCANNER_PARAMS", JSON.stringify(sqScannerParams));
  await scanner.runAnalysis();
  tl.setVariable("SONARQUBE_SCANNER_PARAMS", sanitizeVariable(JSON.stringify(sqScannerParams)));
  JavaVersionResolver.revertJavaHomeToOriginal();
}
