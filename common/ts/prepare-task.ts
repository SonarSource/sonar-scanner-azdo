import * as semver from 'semver';
import * as tl from 'vsts-task-lib/task';
import * as vm from 'vso-node-api';
import Endpoint, { EndpointType } from './sonarqube/Endpoint';
import Scanner, { ScannerMode } from './sonarqube/Scanner';
import { toCleanJSON } from './helpers/utils';
import { getServerVersion } from './helpers/request';

const REPO_NAME_VAR = 'Build.Repository.Name';

export default async function prepareTask(endpoint: Endpoint, rootPath: string) {
  if (
    endpoint.type === EndpointType.SonarQube &&
    (endpoint.url.startsWith('https://sonarcloud.io') ||
      endpoint.url.startsWith('https://sonarqube.com'))
  ) {
    tl.warning(
      'There is a dedicated extension for SonarCloud: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud'
    );
  }

  const scannerMode: ScannerMode = ScannerMode[tl.getInput('scannerMode')];
  const scanner = Scanner.getPrepareScanner(rootPath, scannerMode);

  const props: { [key: string]: string } = {};

  if (await branchFeatureSupported(endpoint)) {
    await populateBranchAndPrProps(props);
    tl.debug(`[SQ] Branch and PR parameters: ${JSON.stringify(props)}`);
  }

  tl
    .getDelimitedInput('extraProperties', '\n')
    .filter(keyValue => !keyValue.startsWith('#'))
    .map(keyValue => keyValue.split(/=(.+)/))
    .forEach(([k, v]) => (props[k] = v));

  tl.setVariable('SONARQUBE_SCANNER_MODE', scannerMode);
  tl.setVariable('SONARQUBE_ENDPOINT', endpoint.toJson(), true);
  tl.setVariable(
    'SONARQUBE_SCANNER_PARAMS',
    toCleanJSON({
      ...endpoint.toSonarProps(),
      ...scanner.toSonarProps(),
      ...props
    })
  );

  await scanner.runPrepare();
}

async function branchFeatureSupported(endpoint) {
  if (endpoint.type === EndpointType.SonarCloud) {
    return true;
  }
  const serverVersion = await getServerVersion(endpoint);
  return serverVersion >= semver.parse('7.2.0');
}

async function populateBranchAndPrProps(props: { [key: string]: string }) {
  const collectionUrl = tl.getVariable('System.TeamFoundationCollectionUri');
  const prId = tl.getVariable('System.PullRequest.PullRequestId');
  const provider = tl.getVariable('Build.Repository.Provider');
  if (prId) {
    props['sonar.pullrequest.key'] = prId;
    props['sonar.pullrequest.base'] = branchName(tl.getVariable('System.PullRequest.TargetBranch'));
    props['sonar.pullrequest.branch'] = branchName(
      tl.getVariable('System.PullRequest.SourceBranch')
    );
    if (provider === 'TfsGit') {
      props['sonar.pullrequest.provider'] = 'vsts';
      props['sonar.pullrequest.vsts.instanceUrl'] = collectionUrl;
      props['sonar.pullrequest.vsts.project'] = tl.getVariable('System.TeamProject');
      props['sonar.pullrequest.vsts.repository'] = tl.getVariable(REPO_NAME_VAR);
    } else if (provider === 'GitHub') {
      props['sonar.pullrequest.key'] = tl.getVariable('System.PullRequest.PullRequestNumber');
      props['sonar.pullrequest.provider'] = 'github';
      props['sonar.pullrequest.github.repository'] = tl.getVariable(REPO_NAME_VAR);
    } else {
      tl.warning(`Unkwnow provider '${provider}'`);
      props['sonar.scanner.skip'] = 'true';
    }
  } else {
    const defaultBranch = await getDefaultBranch(provider, collectionUrl);
    const currentBranch = tl.getVariable('Build.SourceBranch');
    if (defaultBranch !== currentBranch) {
      props['sonar.branch.name'] = branchName(currentBranch);
    }
  }
}

function branchName(fullName: string) {
  if (fullName.startsWith('refs/heads/')) {
    return fullName.substring('refs/heads/'.length);
  }
  return fullName;
}

/**
 * Query the repo to get the full name of the default branch.
 * @param collectionUrl
 */
async function getDefaultBranch(provider: string, collectionUrl: string) {
  const DEFAULT = 'refs/heads/master';
  if (provider !== 'TfsGit') {
    return DEFAULT;
  }
  try {
    const vsts = getWebApi(collectionUrl);
    const gitApi = await vsts.getGitApi();
    const repo = await gitApi.getRepository(
      tl.getVariable(REPO_NAME_VAR),
      tl.getVariable('System.TeamProject')
    );
    tl.debug(`Default branch of this repository is '${repo.defaultBranch}'`);
    return repo.defaultBranch;
  } catch (e) {
    tl.warning("Unable to get default branch, defaulting to 'master': " + e);
    return DEFAULT;
  }
}

function getWebApi(collectionUrl: string): vm.WebApi {
  const accessToken = getAuthToken();
  const credentialHandler = vm.getBearerHandler(accessToken);
  return new vm.WebApi(collectionUrl, credentialHandler);
}

function getAuthToken() {
  const auth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
  if (auth.scheme.toLowerCase() === 'oauth') {
    return auth.parameters['AccessToken'];
  } else {
    throw new Error('Unable to get credential to perform rest API calls');
  }
}
