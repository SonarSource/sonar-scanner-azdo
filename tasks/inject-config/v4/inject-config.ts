import * as tl from 'vsts-task-lib/task';
import * as trm from 'vsts-task-lib/toolrunner';
import { EndpointType } from '../../../common/v4/types';
import { PROP_NAMES, toCleanJSON } from '../../../common/v4/utils';

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
    props[PROP_NAMES.PROJECTKEY] = tl.getInput('projectKey');
    props[PROP_NAMES.PROJECTNAME] = tl.getInput('projectName');
    props[PROP_NAMES.PROJECTVERSION] = tl.getInput('projectVersion');

    tl
      .getDelimitedInput('extraProperties', '\n')
      .map(keyValue => keyValue.split(/=(.+)/))
      .forEach(([k, v]) => (props[k] = v));

    tl.setVariable('SONARQUBE_SCANNER_PARAMS', toCleanJSON(props));
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
