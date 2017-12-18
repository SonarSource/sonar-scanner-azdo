import * as tl from 'vsts-task-lib/task';
import Scanner, { ScannerMode } from '../../../common/ts/Scanner';
import { PROP_NAMES, toCleanJSON } from '../../../common/ts/utils';

async function run() {
  try {
    const scannerMode: ScannerMode = ScannerMode[tl.getVariable('SONARQUBE_SCANNER_MODE')];
    if (!scannerMode) {
      throw new Error(
        "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
      );
    }
    const scanner = Scanner.getAnalyzeScanner(__dirname, scannerMode);
    await scanner.runAnalysis();
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
