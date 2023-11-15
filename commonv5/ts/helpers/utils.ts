import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "./constants";

export function toCleanJSON(props: { [key: string]: string | undefined }) {
  return JSON.stringify(
    props,
    Object.keys(props).filter((key) => props[key] != null),
  );
}

export function sanitizeVariable(jsonPayload: string) {
  const jsonObj = JSON.parse(jsonPayload);
  delete jsonObj[PROP_NAMES.LOGIN];
  delete jsonObj[PROP_NAMES.PASSSWORD];
  jsonPayload = toCleanJSON(jsonObj);
  return jsonPayload;
}

export function isWindows() {
  return tl.getPlatform() === tl.Platform.Windows;
}
