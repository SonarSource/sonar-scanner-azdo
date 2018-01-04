import * as tl from 'vsts-task-lib/task';
import Analysis from '../../../../../common/ts/Analysis';
import Endpoint, { EndpointType, EndpointData } from '../../../../../common/ts/Endpoint';
import Metrics from '../../../../../common/ts/Metrics';
import Task from '../../../../../common/ts/Task';
import TaskReport from '../../../../../common/ts/TaskReport';
import { publishBuildSummary } from '../../../../../common/ts/vsts-server-utils';

async function run() {
  tl.debug('[SQ] Start publish task');
  const params = tl.getVariable('SONARQUBE_SCANNER_PARAMS');
  if (!params) {
    tl.setResult(
      tl.TaskResult.Failed,
      'The SonarCloud Prepare Analysis Configuration must be added.'
    );
    return;
  }
  try {
    const endpointData: { type: EndpointType; data: EndpointData } = JSON.parse(
      tl.getVariable('SONARQUBE_ENDPOINT')
    );
    const endpoint = new Endpoint(endpointData.type, endpointData.data);
    const metrics = await Metrics.getAllMetrics(endpoint);

    const taskReport = await TaskReport.createTaskReportFromFile();
    const task = await Task.waitForTaskCompletion(endpoint, taskReport.ceTaskId);
    const analysis = await Analysis.getAnalysis(
      task.analysisId,
      endpoint,
      metrics,
      taskReport.dashboardUrl
    );
    publishBuildSummary(analysis.getHtmlAnalysisReport(), endpoint.type);
  } catch (err) {
    tl.debug('[SQ] Publish task error: ' + err.message);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
