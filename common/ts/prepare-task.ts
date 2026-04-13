import * as tl from "azure-pipelines-task-lib/task";
import * as azdoApiUtils from "./helpers/azdo-api-utils";
import { DEPRECATION_MESSAGE } from "./helpers/constants";
import { toCleanJSON, sanitizeVariable } from "./helpers/utils";
import Endpoint from './sonarqube/Endpoint';
import Scanner, { ScannerMode } from "./sonarqube/Scanner";

const REPO_NAME_VAR = "Build.Repository.Name";

export default async function prepareTask(endpoint: Endpoint, rootPath: string) {

  tl.warning(DEPRECATION_MESSAGE);

  const scannerMode: ScannerMode = ScannerMode[tl.getInput("scannerMode")];
  const scanner = Scanner.getPrepareScanner(rootPath, scannerMode);

  const props: { [key: string]: string } = {};


    await populateBranchAndPrProps(props);
    /* branchFeatureSupported method magically checks everything we need for the support of the below property, 
    so we keep it like that for now, waiting for a hardening that will refactor this (at least by renaming the method name) */
    tl.debug(
      "SonarCloud or SonarQube version >= 7.2.0 detected, setting report-task.txt file to its newest location.",
    );
    // SEC-FIX: Do not log branch/PR props — they may contain project keys and branch names
    tl.debug("[SQ] Branch and PR parameters populated.");


  tl.getDelimitedInput("extraProperties", "\n")
    .filter((keyValue) => !keyValue.startsWith("#"))
    .map((keyValue) => keyValue.split(/=(.+)/))
    .forEach(([k, v]) => (props[k] = v));

  tl.setVariable("SONARQUBE_SCANNER_MODE", scannerMode);
  tl.setVariable("SONARQUBE_ENDPOINT", endpoint.toJson(), true);

  const jsonParams = toCleanJSON({
    ...endpoint.toSonarProps(),
    ...scanner.toSonarProps(),
    ...props,
  });

  tl.setVariable("SONARQUBE_SCANNER_PARAMS", sanitizeVariable(jsonParams));

  await scanner.runPrepare();
}


export async function populateBranchAndPrProps(props: { [key: string]: string }) {
  const collectionUrl = tl.getVariable("System.TeamFoundationCollectionUri");
  const prId = tl.getVariable("System.PullRequest.PullRequestId");
  const provider = tl.getVariable("Build.Repository.Provider");
  if (prId) {
    props["sonar.pullrequest.key"] = prId;
    props["sonar.pullrequest.base"] = branchName(tl.getVariable("System.PullRequest.TargetBranch"));
    props["sonar.pullrequest.branch"] = branchName(
      tl.getVariable("System.PullRequest.SourceBranch"),
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
    let isDefaultBranch = true;
    const currentBranch = tl.getVariable("Build.SourceBranch");
    if (provider === "TfsGit") {
      isDefaultBranch = currentBranch === (await getDefaultBranch(collectionUrl));
    } else if (provider === "Git" || provider === "GitHub" || provider === "GitHubEnterprise") {
      // TODO for GitHub we should get the default branch configured on the repo
      isDefaultBranch = currentBranch === "refs/heads/master";
    } else if (provider === "Bitbucket") {
      // TODO for Bitbucket Cloud we should get the main branch configured on the repo
      isDefaultBranch = currentBranch === "refs/heads/master";
    } else if (provider === "Svn") {
      isDefaultBranch = currentBranch === "trunk";
    }
    if (!isDefaultBranch) {
      // VSTS-165 don't use Build.SourceBranchName
      props["sonar.branch.name"] = branchName(tl.getVariable("Build.SourceBranch"));
    }
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

/**
 * Waiting for https://github.com/Microsoft/vsts-tasks/issues/7592
 * query the repo to get the full name of the default branch.
 * @param collectionUrl
 */
export async function getDefaultBranch(collectionUrl: string) {
  const DEFAULT = "refs/heads/master";
  try {
    const vsts = azdoApiUtils.getWebApi(collectionUrl);
    const gitApi = await vsts.getGitApi();
    const repo = await gitApi.getRepository(
      tl.getVariable(REPO_NAME_VAR),
      tl.getVariable("System.TeamProject"),
    );
    // SEC-FIX: Do not log the default branch name — it reveals repository structure
    tl.debug(`Default branch retrieved for this repository.`);
    return repo.defaultBranch;
  } catch (e) {
    tl.warning("Unable to get default branch, defaulting to 'master': " + e);
    return DEFAULT;
  }
}
