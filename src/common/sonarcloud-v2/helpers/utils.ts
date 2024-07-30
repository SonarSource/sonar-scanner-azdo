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
  delete scannerParams[PROP_NAMES.LOGIN];
  delete scannerParams[PROP_NAMES.PASSSWORD];
  return scannerParams;
}

export function isWindows() {
  return tl.getPlatform() === tl.Platform.Windows;
}
