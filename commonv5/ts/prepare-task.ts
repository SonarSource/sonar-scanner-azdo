import * as tl from "azure-pipelines-task-lib/task";
import * as semver from "semver";
import { getWebApi, parseScannerExtraProperties } from "./helpers/azdo-api-utils";
import {
  AzureBuildVariables,
  AzureProvider,
  DEFAULT_BRANCH_REF,
  TaskVariables,
} from "./helpers/constants";
import { getServerVersion } from "./helpers/request";
import { toCleanJSON } from "./helpers/utils";
import Endpoint, { EndpointType } from "./sonarqube/Endpoint";
import Scanner, { ScannerMode } from "./sonarqube/Scanner";
import TaskReport from "./sonarqube/TaskReport";

export default async function prepareTask(endpoint: Endpoint, rootPath: string) {
  const scannerMode: ScannerMode = ScannerMode[tl.getInput("scannerMode")];
  const scanner = Scanner.getPrepareScanner(rootPath, scannerMode);
  const serverVersion = await getServerVersion(endpoint);

  let props: { [key: string]: string } = {};

  if (branchFeatureSupported(endpoint, serverVersion)) {
    await populateBranchAndPrProps(props);
    /* branchFeatureSupported method magically checks everything we need for the support of the below property, 
    so we keep it like that for now, waiting for a hardening that will refactor this (at least by renaming the method name) */
    tl.debug(
      "SonarCloud or SonarQube version >= 7.2.0 detected, setting report-task.txt file to its newest location.",
    );
    props["sonar.scanner.metadataFilePath"] = TaskReport.getDefaultPath();
    tl.debug(`[SQ] Branch and PR parameters: ${JSON.stringify(props)}`);
  }

  props = {
    ...props,
    ...parseScannerExtraProperties(),
  };

  tl.setVariable(TaskVariables.SonarQubeServerVersion, serverVersion.format());
  tl.setVariable(TaskVariables.SonarQubeScannerMode, scannerMode);
  tl.setVariable(
    TaskVariables.SonarQubeScannerReportTaskFile,
    props["sonar.scanner.metadataFilePath"],
  );
  tl.setVariable(TaskVariables.SonarQubeEndpoint, endpoint.toJson(), true);

  tl.getDelimitedInput("extraProperties", "\n")
    .filter((keyValue) => !keyValue.startsWith("#"))
    .map((keyValue) => keyValue.split(/=(.+)/))
    .forEach(([k, v]) => (props[k] = v));

  tl.setVariable(TaskVariables.SonarQubeScannerMode, scannerMode);
  tl.setVariable(TaskVariables.SonarQubeEndpoint, endpoint.toJson(), true);

  const jsonParams = toCleanJSON({
    ...endpoint.toSonarProps(serverVersion),
    ...scanner.toSonarProps(),
    ...props,
  });

  tl.setVariable(TaskVariables.SonarQubeScannerParams, jsonParams);

  await scanner.runPrepare();
}

export function branchFeatureSupported(endpoint, serverVersion: string | semver.SemVer) {
  if (endpoint.type === EndpointType.SonarCloud) {
    return true;
  }
  return semver.satisfies(serverVersion, ">=7.2.0");
}

export async function populateBranchAndPrProps(props: { [key: string]: string }) {
  const collectionUrl = tl.getVariable("System.TeamFoundationCollectionUri");
  const provider = tl.getVariable("Build.Repository.Provider") as AzureProvider;
  const pullRequestId = tl.getVariable("System.PullRequest.PullRequestId");

  // If analyzing a pull request
  if (pullRequestId) {
    props["sonar.pullrequest.key"] = pullRequestId;
    props["sonar.pullrequest.base"] = getBranchNameFromRef(
      tl.getVariable("System.PullRequest.TargetBranch"),
    );
    props["sonar.pullrequest.branch"] = getBranchNameFromRef(
      tl.getVariable("System.PullRequest.SourceBranch"),
    );
    // Set provider-specific properties
    if (provider === AzureProvider.TfsGit) {
      // sonar.pullrequest.provider is deprecated in 8.1 and dropped between 8.1-8.9
      // We keep this to support legacy versions of SQ and due to the fact that scanner
      // is not rejecting this property. However we should drop it later on
      props["sonar.pullrequest.provider"] = "vsts";
      props["sonar.pullrequest.vsts.instanceUrl"] = collectionUrl;
      props["sonar.pullrequest.vsts.project"] = tl.getVariable("System.TeamProject");
      props["sonar.pullrequest.vsts.repository"] = tl.getVariable(
        AzureBuildVariables.BuildRepositoryName,
      );
    } else if (provider === AzureProvider.GitHub || provider === AzureProvider.GitHubEnterprise) {
      props["sonar.pullrequest.key"] = tl.getVariable("System.PullRequest.PullRequestNumber");
      props["sonar.pullrequest.provider"] = "github";
      props["sonar.pullrequest.github.repository"] = tl.getVariable(
        AzureBuildVariables.BuildRepositoryName,
      );
    } else if (provider === AzureProvider.Bitbucket) {
      props["sonar.pullrequest.provider"] = "bitbucketcloud";
    } else {
      tl.warning(`Unsupported PR provider '${provider}'`);
      props["sonar.scanner.skip"] = "true";
    }
  } else if (!(await isDefaultBranch())) {
    // If analyzing a branch and not on default branch, specify branch
    props["sonar.branch.name"] = getBranchNameFromRef(tl.getVariable("Build.SourceBranch"));
  }
}

/**
 * In the case of branch analysis, we need to know if we are on the default branch.
 * If that is the case, we try to not specify the sonar.branch.name parameter to avoid getting
 * rejected by SonarQube Communnity Edition.
 */
async function isDefaultBranch() {
  const collectionUrl = tl.getVariable("System.TeamFoundationCollectionUri");
  const provider = tl.getVariable("Build.Repository.Provider") as AzureProvider;
  const currentBranch = tl.getVariable("Build.SourceBranch");

  if (provider === AzureProvider.TfsGit) {
    return currentBranch === (await getDefaultBranch(collectionUrl));
  }

  if (provider === AzureProvider.Svn) {
    return currentBranch === "trunk";
  }

  // For these providers, we can not know what is the default branch for projects.
  // Therefore, we assume that if the branch is called master, then it is the default one.
  // @see Feature request https://developercommunity.visualstudio.com/t/Add-a-variable-with-the-name-of-the-defa/10400800
  if (
    [
      AzureProvider.Git,
      AzureProvider.GitHub,
      AzureProvider.GitHubEnterprise,
      AzureProvider.Bitbucket,
    ].includes(provider)
  ) {
    tl.debug(
      `Unable to get default branch with provider ${provider}, assuming 'master' is the default branch.`,
    );
    return currentBranch === DEFAULT_BRANCH_REF;
  }

  return true;
}

/**
 * We compute the branch name from the full ref, @see VSTS-165 Don't use Build.SourceBranchName
 */
function getBranchNameFromRef(fullName: string) {
  return fullName.replace(/^refs\/heads\//, "");
}

/**
 * Query Azure Repo to get the full name of the default branch
 */
export async function getDefaultBranch(collectionUrl: string): Promise<string | null> {
  try {
    const vsts = getWebApi(collectionUrl);
    const gitApi = await vsts.getGitApi();
    const repo = await gitApi.getRepository(
      tl.getVariable(AzureBuildVariables.BuildRepositoryName),
      tl.getVariable("System.TeamProject"),
    );
    tl.debug(`Default branch of this repository is '${repo.defaultBranch}'`);
    return repo.defaultBranch;
  } catch (e) {
    tl.debug("Unable to get default branch, defaulting to 'master': " + e);
    return DEFAULT_BRANCH_REF;
  }
}
