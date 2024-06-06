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
  SonarQubeServerVersion = "SONARQUBE_SERVER_VERSION",
  SonarQubeScannerMode = "SONARQUBE_SCANNER_MODE",
  SonarQubeScannerParams = "SONARQUBE_SCANNER_PARAMS",
  SonarQubeScannerReportTaskFile = "SONARQUBE_SCANNER_REPORTTASKFILE",
  SonarQubeEndpoint = "SONARQUBE_ENDPOINT",
  SonarQubeScannerMSBuildExe = "SONARQUBE_SCANNER_MSBUILD_EXE",
  SonarQubeScannerMSBuildDll = "SONARQUBE_SCANNER_MSBUILD_DLL",
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

export const LATEST_DOC =
  "https://docs.sonarsource.com/sonarcloud/advanced-setup/ci-based-analysis/sonarcloud-extension-for-azure-devops/";
export const DEPRECATION_MESSAGE = `This task is deprecated. Please upgrade to the latest version. For more information, refer to ${LATEST_DOC}`;

export enum Status {
  OK = 200,
}
