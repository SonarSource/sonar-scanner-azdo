import * as tl from 'vsts-task-lib/task';
import Endpoint, { EndpointType } from './sonarqube/Endpoint';
import Scanner, { ScannerMode } from './sonarqube/Scanner';
import { PROP_NAMES, toCleanJSON } from './helpers/utils';

export default async function prepareTask(endpoint: Endpoint, rootPath: string) {
  const scannerMode: ScannerMode = ScannerMode[tl.getInput('scannerMode')];
  const scanner = Scanner.getPrepareScanner(rootPath, scannerMode);

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
}
