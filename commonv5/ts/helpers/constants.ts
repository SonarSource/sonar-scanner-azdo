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
