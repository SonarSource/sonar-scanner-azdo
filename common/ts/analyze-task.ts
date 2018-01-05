import * as tl from 'vsts-task-lib/task';
import Scanner, { ScannerMode } from './sonarqube/Scanner';
import { PROP_NAMES, toCleanJSON } from './helpers/utils';

export default async function analyzeTask(rootPath: string) {
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable('SONARQUBE_SCANNER_MODE')];
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
    );
  }
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  await scanner.runAnalysis();
}
