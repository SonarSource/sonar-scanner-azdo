import * as tl from "azure-pipelines-task-lib/task";
import path from "path";
import { DEPRECATION_MESSAGE } from "./helpers/constants";
import JavaVersionResolver from "./helpers/java-version-resolver";
import { PROP_NAMES, sanitizeVariable } from "./helpers/utils";
import { TaskJob } from "./run";
import { EndpointData, EndpointType } from "./sonarqube/Endpoint";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";

const JAVA_11_PATH_ENV_NAME = "JAVA_HOME_11_X64";

export const analyzeTask: TaskJob = async (endpointType: EndpointType) => {
  const rootPath = path.join(__dirname, "..");

  const scannerMode: ScannerMode = ScannerMode[tl.getVariable("SONARQUBE_SCANNER_MODE")];
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task",
    );
  }

  tl.warning(DEPRECATION_MESSAGE);

  Scanner.setIsSonarCloud(endpointType === EndpointType.SonarCloud);
  JavaVersionResolver.setJavaHomeToIfAvailable(JAVA_11_PATH_ENV_NAME);
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  let sqScannerParams = tl.getVariable("SONARQUBE_SCANNER_PARAMS");
  sqScannerParams = JSON.parse(sqScannerParams);

  const endpointData: { type: EndpointType; data: EndpointData } = JSON.parse(
    tl.getVariable("SONARQUBE_ENDPOINT"),
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
};
