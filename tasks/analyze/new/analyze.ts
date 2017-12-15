import * as tl from 'vsts-task-lib/task';
import * as trm from 'vsts-task-lib/toolrunner';
import { EndpointType } from '../../../common/ts/types';
import { PROP_NAMES, toCleanJSON } from '../../../common/ts/utils';

function runMsBuildEnd() {
  const scannerExe = tl.getVariable('SONARQUBE_SCANNER_MSBUILD_EXE');
  const msBuildScannerRunner = tl.tool(scannerExe);
  msBuildScannerRunner.arg('end');
  return msBuildScannerRunner.exec();
}

function runScannerCli() {
  const isWindows = tl.osType().match(/^Win/);
  let scannerExe = tl.resolve(__dirname, 'sonar-scanner', 'bin', 'sonar-scanner');
  const scannerRunner = tl.tool(scannerExe);
  if (isWindows) {
    scannerExe += '.bat';
  }
  return scannerRunner.exec();
}

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
      throw new Error('Unknwon scanner mode: ' + scannerMode);
    }
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
