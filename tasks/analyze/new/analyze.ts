import * as tl from 'vsts-task-lib/task';
import { PROP_NAMES, toCleanJSON } from '../../../common/ts/utils';
import { runMsBuildEnd, runScannerCli } from '../../../common/ts/vsts-server-utils';

async function run() {
  try {
    const scannerMode = tl.getVariable('SONARQUBE_SCANNER_MODE');
    if (!scannerMode) {
      throw new Error(
        "The 'Prepare Analysis Configuration' task was not executed prior to this task"
      );
    }
    if (scannerMode === 'Other') {
      tl.warning(
        "When using Maven or Gradle, don't use this task but instead tick the 'SonarQube' option in the Maven/Gradle task to run the scanner as part of the build"
      );
    } else if (scannerMode === 'MSBuild') {
      await runMsBuildEnd();
    } else if (scannerMode === 'CLI') {
      await runScannerCli();
    } else {
      throw new Error('Unknown scanner mode: ' + scannerMode);
    }
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
