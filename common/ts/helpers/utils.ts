import * as tl from "azure-pipelines-task-lib/task";

export const PROP_NAMES = {
  HOST_URL: "sonar.host.url",
  LOGIN: "sonar.login",
  PASSSWORD: "sonar.password",
  ORG: "sonar.organization",
  PROJECTKEY: "sonar.projectKey",
  PROJECTNAME: "sonar.projectName",
  PROJECTVERSION: "sonar.projectVersion",
  PROJECTSOURCES: "sonar.sources",
  PROJECTSETTINGS: "project.settings",
};

export function toCleanJSON(props: { [key: string]: string | undefined }) {
  return JSON.stringify(
    props,
    Object.keys(props).filter((key) => props[key] != null),
  );
}

export function setIfNotEmpty(props: { [key: string]: string }, key: string, value?: string) {
  if (value) {
    props[key] = value;
  }
}

export function sanitizeVariable(jsonPayload: string) {
  const jsonObj = JSON.parse(jsonPayload);
  // SEC-002: Strip all credential properties from scanner params
  delete jsonObj[PROP_NAMES.LOGIN];
  delete jsonObj[PROP_NAMES.PASSSWORD];
  delete jsonObj["sonar.token"];
  delete jsonObj["sonar.scanner.metadataFilePath"];
  delete jsonObj["sonar.organization"];
  delete jsonObj["sonar.projectKey"];
  jsonPayload = toCleanJSON(jsonObj);
  return jsonPayload;
}

export function isWindows() {
  return tl.getPlatform() === tl.Platform.Windows;
}
