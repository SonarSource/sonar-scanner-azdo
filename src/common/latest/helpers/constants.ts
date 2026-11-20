/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as semver from "semver";

export const PROP_NAMES = {
  HOST_URL: "sonar.host.url",
  TOKEN: "sonar.token",
  LOGIN: "sonar.login",
  PASSWORD: "sonar.password",
  ORG: "sonar.organization",
  PROJECTKEY: "sonar.projectKey",
  PROJECTNAME: "sonar.projectName",
  PROJECTVERSION: "sonar.projectVersion",
  PROJECTSOURCES: "sonar.sources",
  PROJECTSETTINGS: "project.settings",
};

export const SCANNER_CLI_NAME = "sonar-scanner";

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
  SonarScannerParams = "SONARQUBE_SCANNER_PARAMS",
  SonarScannerReportTaskFile = "SONAR_SCANNER_REPORTTASKFILE",
  SonarEndpoint = "SONAR_ENDPOINT",
  SonarScannerDotnetExe = "SONAR_SCANNER_DOTNET_EXE",
  SonarScannerDotnetDll = "SONAR_SCANNER_DOTNET_DLL",
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
export const SQ_VERSION_DROPPING_JAVA_11 = semver.coerce("10.4") as semver.SemVer;
