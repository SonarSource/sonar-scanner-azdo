import * as path from "path";
import * as fs from "fs-extra";
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
    Object.keys(props).filter((key) => props[key] != null)
  );
}

export function setIfNotEmpty(props: { [key: string]: string }, key: string, value?: string) {
  if (value) {
    props[key] = value;
  }
}

export function isWindows() {
  return tl.osType().match(/^Win/);
}

export function getTaskVersion(taskJsonPath: string): string {
  const fullPath = path.join(taskJsonPath, "task.json");
  if (!fs.existsSync(fullPath)) {
    return "1.0.0";
  }
  const fileContent = fs.readFileSync(path.join(taskJsonPath, "task.json"), "utf8");
  const jsonContent = JSON.parse(fileContent);
  return `${jsonContent.version.Major}.${jsonContent.version.Minor}.${jsonContent.version.Patch}`;
}
