import * as tl from 'vsts-task-lib/task';
import Endpoint, { EndpointType } from '../../../common/ts/Endpoint';
import { PROP_NAMES, toCleanJSON } from '../../../common/ts/utils';
import { runMsBuildBegin } from '../../../common/ts/vsts-server-utils';

async function run() {
  try {
    const endpointType: EndpointType = EndpointType[tl.getInput('endpointType', true)];
    const endpointId = tl.getInput(endpointType, true);
    const endpoint = Endpoint.getEndpoint(endpointId, endpointType);

    const scannerMode = tl.getInput('scannerMode');
    const isMSBuild = scannerMode === 'MSBuild';
    const props: { [key: string]: string } = {};
    if (isMSBuild) {
      props[PROP_NAMES.PROJECTKEY] = tl.getInput('msBuildProjectKey', true);
      props[PROP_NAMES.PROJECTNAME] = tl.getInput('msBuildProjectName');
      props[PROP_NAMES.PROJECTVERSION] = tl.getInput('msBuildProjectVersion');
    } else if (scannerMode === 'CLI') {
      const cliMode = tl.getInput('configMode');
      if (cliMode === 'file') {
        props[PROP_NAMES.PROJECTSETTINGS] = tl.getInput('configFile', true);
      } else {
        props[PROP_NAMES.PROJECTKEY] = tl.getInput('cliProjectKey', true);
        props[PROP_NAMES.PROJECTNAME] = tl.getInput('cliProjectName');
        props[PROP_NAMES.PROJECTVERSION] = tl.getInput('cliProjectVersion');
        props[PROP_NAMES.PROJECTSOURCES] = tl.getInput('cliSources');
      }
    }

    tl
      .getDelimitedInput('extraProperties', '\n')
      .map(keyValue => keyValue.split(/=(.+)/))
      .forEach(([k, v]) => (props[k] = v));

    // So that "run scanner" task knows the choice that user made
    tl.setVariable('SONARQUBE_SCANNER_MODE', scannerMode);
    tl.setVariable('SONARQUBE_ENDPOINT', endpoint.toJson(), true);
    tl.setVariable(
      'SONARQUBE_SCANNER_PARAMS',
      toCleanJSON({
        ...endpoint.toSonarProps(),
        ...props
      })
    );

    if (isMSBuild) {
      await runMsBuildBegin(props[PROP_NAMES.PROJECTKEY]);
    }
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
