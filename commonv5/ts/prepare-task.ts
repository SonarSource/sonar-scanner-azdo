import * as tl from "azure-pipelines-task-lib/task";
import * as semver from "semver";
import { parseScannerExtraProperties } from "./helpers/azdo-api-utils";
import { getServerVersion } from "./helpers/request";
import { toCleanJSON } from "./helpers/utils";
import Endpoint, { EndpointType } from "./sonarqube/Endpoint";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";
import TaskReport from "./sonarqube/TaskReport";

const REPO_NAME_VAR = "Build.Repository.Name";

export default async function prepareTask(endpoint: Endpoint, rootPath: string) {
  if (
    endpoint.type === EndpointType.SonarQube &&
    (endpoint.url.startsWith("https://sonarcloud.io") ||
      endpoint.url.startsWith("https://sonarqube.com"))
  ) {
    tl.warning(
      "There is a dedicated extension for SonarCloud: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud"
    );
  }

  const scannerMode: ScannerMode = ScannerMode[tl.getInput("scannerMode")];
  const scanner = Scanner.getPrepareScanner(rootPath, scannerMode);
  const serverVersion = await getServerVersion(endpoint);

  let props: { [key: string]: string } = {};

  if (await branchFeatureSupported(endpoint, serverVersion)) {
    populateBranchAndPrProps(props);
    /* branchFeatureSupported method magically checks everything we need for the support of the below property, 
    so we keep it like that for now, waiting for a hardening that will refactor this (at least by renaming the method name) */
    tl.debug(
      "SonarCloud or SonarQube version >= 7.2.0 detected, setting report-task.txt file to its newest location."
    );
    props["sonar.scanner.metadataFilePath"] = TaskReport.getDefaultPath();
    tl.debug(`[SQ] Branch and PR parameters: ${JSON.stringify(props)}`);
  }

  props = {
    ...props,
    ...parseScannerExtraProperties(),
  };

  tl.setVariable("SONARQUBE_SERVER_VERSION", serverVersion.format());
  tl.setVariable("SONARQUBE_SCANNER_MODE", scannerMode);
  tl.setVariable("SONARQUBE_SCANNER_REPORTTASKFILE", props["sonar.scanner.metadataFilePath"]);
  tl.setVariable("SONARQUBE_ENDPOINT", endpoint.toJson(), true);

  tl.getDelimitedInput("extraProperties", "\n")
    .filter((keyValue) => !keyValue.startsWith("#"))
    .map((keyValue) => keyValue.split(/=(.+)/))
    .forEach(([k, v]) => (props[k] = v));

  tl.setVariable("SONARQUBE_SCANNER_MODE", scannerMode);
  tl.setVariable("SONARQUBE_ENDPOINT", endpoint.toJson(), true);

  const jsonParams = toCleanJSON({
    ...endpoint.toSonarProps(serverVersion),
    ...scanner.toSonarProps(),
    ...props,
  });

  tl.setVariable("SONARQUBE_SCANNER_PARAMS", jsonParams);

  await scanner.runPrepare();
}

export function branchFeatureSupported(endpoint, serverVersion: string | semver.SemVer) {
  if (endpoint.type === EndpointType.SonarCloud) {
    return true;
  }
  return semver.satisfies(serverVersion, ">=7.2.0");
}

export function populateBranchAndPrProps(props: { [key: string]: string }) {
  const collectionUrl = tl.getVariable("System.TeamFoundationCollectionUri");
  const prId = tl.getVariable("System.PullRequest.PullRequestId");
  const provider = tl.getVariable("Build.Repository.Provider");
  if (prId) {
    props["sonar.pullrequest.key"] = prId;
    props["sonar.pullrequest.base"] = branchName(tl.getVariable("System.PullRequest.TargetBranch"));
    props["sonar.pullrequest.branch"] = branchName(
      tl.getVariable("System.PullRequest.SourceBranch")
    );
    if (provider === "TfsGit") {
      props["sonar.pullrequest.provider"] = "vsts";
      props["sonar.pullrequest.vsts.instanceUrl"] = collectionUrl;
      props["sonar.pullrequest.vsts.project"] = tl.getVariable("System.TeamProject");
      props["sonar.pullrequest.vsts.repository"] = tl.getVariable(REPO_NAME_VAR);
    } else if (provider === "GitHub" || provider === "GitHubEnterprise") {
      props["sonar.pullrequest.key"] = tl.getVariable("System.PullRequest.PullRequestNumber");
      props["sonar.pullrequest.provider"] = "github";
      props["sonar.pullrequest.github.repository"] = tl.getVariable(REPO_NAME_VAR);
    } else if (provider === "Bitbucket") {
      props["sonar.pullrequest.provider"] = "bitbucketcloud";
    } else {
      tl.warning(`Unsupported PR provider '${provider}'`);
      props["sonar.scanner.skip"] = "true";
    }
  } else {
    props["sonar.branch.name"] = branchName(tl.getVariable("Build.SourceBranch"));
  }
}

/**
 * Waiting for https://github.com/Microsoft/vsts-tasks/issues/7591
 */
function branchName(fullName: string) {
  if (fullName.startsWith("refs/heads/")) {
    return fullName.substring("refs/heads/".length);
  }
  return fullName;
}
