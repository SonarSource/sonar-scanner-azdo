import * as tl from 'azure-pipelines-task-lib/task';
import Scanner, { ScannerMode } from './sonarqube/Scanner';
import TaskReport from './sonarqube/TaskReport';
import * as azdoApiUtils from './helpers/azdo-api-utils';

export default async function analyzeTask(rootPath: string) {
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable('SONARQUBE_SCANNER_MODE')];
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
    );
  }
  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  await scanner.runAnalysis();

  const taskReports = await TaskReport.createTaskReportsFromFiles();

  azdoApiUtils.getVariableGroup().then((variableGroup: azdoApiUtils.VariableGroup)=> {

    tl.debug('Returned : ' + JSON.stringify(variableGroup));
    const buildNumber = tl.getVariable('Build.BuildNumber');
    const ceTaskId = taskReports[0].ceTaskId;
    if (variableGroup === null) {
      azdoApiUtils.createVariableGroup(buildNumber, ceTaskId);
    } else {
      azdoApiUtils.updateVariableGroup(variableGroup, buildNumber, ceTaskId);
    }
  });
}
