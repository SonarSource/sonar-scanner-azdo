import * as tl from 'vsts-task-lib/task';
import * as trm from 'vsts-task-lib/toolrunner';
import { EndpointType } from '../../../common/ts/types';
import { PROP_NAMES, toCleanJSON } from '../../../common/ts/utils';

function runMsBuildBegin(projectKey) {
  const scannerExe = tl.resolve(
    __dirname,
    'sonar-scanner-msbuild',
    'SonarQube.Scanner.MSBuild.exe'
  );
  tl.setVariable('SONARQUBE_SCANNER_MSBUILD_EXE', scannerExe);
  const msBuildScannerRunner = tl.tool(scannerExe);
  msBuildScannerRunner.arg('begin');
  msBuildScannerRunner.arg('/k:' + projectKey);
  return msBuildScannerRunner.exec();
}

async function run() {
  try {
    const props: { [key: string]: string } = {};
    const endpointType: EndpointType = EndpointType[tl.getInput('endpointType', true)];
    const endpoint = tl.getInput(endpointType, true);
    switch (endpointType) {
      case EndpointType.SonarCloud:
        props[PROP_NAMES.LOGIN] = tl.getEndpointAuthorizationParameter(endpoint, 'apitoken', false);
        props[PROP_NAMES.ORG] = tl.getInput('organization', true);
        break;
      case EndpointType.SonarQube:
        props[PROP_NAMES.LOGIN] = tl.getEndpointAuthorizationParameter(endpoint, 'username', true);
        props[PROP_NAMES.PASSSWORD] = tl.getEndpointAuthorizationParameter(
          endpoint,
          'password',
          true
        );
        break;
      default:
        throw new Error('Unknown endpoint type: ' + endpointType);
    }
    props[PROP_NAMES.HOST_URL] = tl.getEndpointUrl(endpoint, false);
    const scannerMode = tl.getInput('scannerMode');
    // So that "run scanner" task knows the choice that user made made
    tl.setVariable('SONARQUBE_SCANNER_MODE', scannerMode);

    const isMSBuild = scannerMode === 'MSBuild';
    let projectKey;
    if (isMSBuild) {
      projectKey = tl.getInput('msBuildProjectKey', true);
      props[PROP_NAMES.PROJECTNAME] = tl.getInput('msBuildProjectName');
      props[PROP_NAMES.PROJECTVERSION] = tl.getInput('msBuildProjectVersion');
    } else if (scannerMode === 'CLI') {
      projectKey = tl.getInput('cliProjectKey', true);
      props[PROP_NAMES.PROJECTNAME] = tl.getInput('cliProjectName');
      props[PROP_NAMES.PROJECTVERSION] = tl.getInput('cliProjectVersion');
      props[PROP_NAMES.PROJECTSOURCES] = tl.getInput('cliSources');
    }
    props[PROP_NAMES.PROJECTKEY] = projectKey;

    tl
      .getDelimitedInput('extraProperties', '\n')
      .map(keyValue => keyValue.split(/=(.+)/))
      .forEach(([k, v]) => (props[k] = v));

    tl.setVariable('SONARQUBE_SCANNER_PARAMS', toCleanJSON(props));

    if (isMSBuild) {
      await runMsBuildBegin(projectKey);
    }
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
