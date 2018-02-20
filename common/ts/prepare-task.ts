import * as tl from 'vsts-task-lib/task';
import Endpoint from './sonarqube/Endpoint';
import Scanner, { ScannerMode } from './sonarqube/Scanner';
import { toCleanJSON } from './helpers/utils';

export default async function prepareTask(endpoint: Endpoint, rootPath: string) {
  const scannerMode: ScannerMode = ScannerMode[tl.getInput('scannerMode')];
  const scanner = Scanner.getPrepareScanner(rootPath, scannerMode);

  const props: { [key: string]: string } = {};
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
