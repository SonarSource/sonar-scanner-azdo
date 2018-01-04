import * as tl from 'vsts-task-lib/task';
import Endpoint, { EndpointType } from '../../../../../common/ts/Endpoint';
import Scanner, { ScannerMode } from '../../../../../common/ts/Scanner';
import { PROP_NAMES, toCleanJSON } from '../../../../../common/ts/utils';

async function run() {
  try {
    const endpointType: EndpointType = EndpointType[tl.getInput('endpointType', true)];
    const scannerMode: ScannerMode = ScannerMode[tl.getInput('scannerMode')];
    const endpoint = Endpoint.getEndpoint(tl.getInput(endpointType, true), endpointType);
    const scanner = Scanner.getPrepareScanner(__dirname, scannerMode);

    const props: { [key: string]: string } = {};
    tl
      .getDelimitedInput('extraProperties', '\n')
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
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
