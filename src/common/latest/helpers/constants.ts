import * as semver from "semver";

export const PROP_NAMES = {
  HOST_URL: "sonar.host.url",
  TOKEN: "sonar.token",
  LOGIN: "sonar.login",
  PASSSWORD: "sonar.password",
  ORG: "sonar.organization",
  PROJECTKEY: "sonar.projectKey",
  PROJECTNAME: "sonar.projectName",
  PROJECTVERSION: "sonar.projectVersion",
  PROJECTSOURCES: "sonar.sources",
  PROJECTSETTINGS: "project.settings",
};

export const SCANNER_CLI_FOLDER = "sonar-scanner";

export enum JdkVersionSource {
  JavaHome = "JAVA_HOME",
  JavaHome11 = "JAVA_HOME_11_X64",
  JavaHome17 = "JAVA_HOME_17_X64",
  JavaHome21 = "JAVA_HOME_21_X64",
}

export enum AzureProvider {
  TfsGit = "TfsGit",
  Svn = "Svn",
  Git = "Git",
  GitHub = "GitHub",
  GitHubEnterprise = "GitHubEnterprise",
  Bitbucket = "Bitbucket",
}

export const DEFAULT_BRANCH_REF = "refs/heads/master";

export enum AzureBuildVariables {
  BuildRepositoryName = "Build.Repository.Name",
}

export enum TaskVariables {
  SonarServerVersion = "SONAR_SERVER_VERSION",
  SonarScannerMode = "SONAR_SCANNER_MODE",
  SonarScannerParams = "SONAR_SCANNER_JSON_PARAMS",
  SonarScannerReportTaskFile = "SONAR_SCANNER_REPORTTASKFILE",
  SonarEndpoint = "SONAR_ENDPOINT",
  SonarScannerMSBuildExe = "SONAR_SCANNER_MSBUILD_EXE",
  SonarScannerMSBuildDll = "SONAR_SCANNER_MSBUILD_DLL",
  SonarMsBuildVersion = "SONAR_MSBUILD_VERSION",
  SonarCliVersion = "SONAR_CLI_VERSION",
  SonarScannerLocation = "SONAR_SCANNER_LOCATION",
  JavaHome = "JAVA_HOME",
}

export const TASK_MISSING_VARIABLE_ERROR_HINT = `Make sure you are not mixing tasks from different major versions. If you are using a multistage pipeline, make sure the tasks are in the same stage.`;

export const SQ_PULLREQUEST_MEASURES = [
  "new_violations",
  "pull_request_fixed_issues",
  "new_accepted_issues",
  "new_security_hotspots",
  "new_coverage",
  "new_duplicated_lines_density",
];

export const SQ_BRANCH_MEASURES = [
  "new_violations",
  "new_accepted_issues",
  "new_security_hotspots",
  "new_coverage",
  "new_duplicated_lines_density",
];

/**
 * First SQ version that drops support for Java 11
 */
export const SQ_VERSION_DROPPING_JAVA_11 = semver.coerce("10.4");
