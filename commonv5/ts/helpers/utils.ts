import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "./constants";

type ScannerParams = { [key: string]: string | undefined };

export function waitFor(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export function stringifyScannerParams(scannerParams: ScannerParams) {
  return JSON.stringify(
    scannerParams,
    Object.keys(scannerParams).filter((key) => scannerParams[key] != null),
  );
}

export function sanitizeScannerParams(scannerParams: ScannerParams) {
  // SEC-002: Strip all credential properties from scanner params
  delete scannerParams[PROP_NAMES.LOGIN];
  delete scannerParams[PROP_NAMES.PASSSWORD];
  delete scannerParams[PROP_NAMES.TOKEN];
  delete scannerParams["sonar.scanner.metadataFilePath"];
  delete scannerParams["sonar.organization"];
  delete scannerParams["sonar.projectKey"];
  return scannerParams;
}

export function isWindows() {
  return tl.getPlatform() === tl.Platform.Windows;
}
