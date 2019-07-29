import * as tl from 'azure-pipelines-task-lib/task';
import { InvalidApiResourceVersionError } from 'azure-devops-node-api/VsoClient';
import Analysis from '../sonarqube/Analysis';
import Endpoint, { EndpointType } from '../sonarqube/Endpoint';
import Metrics from '../sonarqube/Metrics';
import Task, { TimeOutReachedError } from '../sonarqube/Task';
import TaskReport from '../sonarqube/TaskReport';
import * as publishTask from '../publish-task';
import * as serverUtils from '../helpers/vsts-server-utils';

beforeEach(() => {
  jest.restoreAllMocks();
});

const TASK_REPORT = new TaskReport({
  ceTaskId: '111',
  ceTaskUrl: 'http://taskurl1',
  dashboardUrl: 'http://dashboardurl1',
  projectKey: 'projectKey1',
  serverUrl: 'http:/serverUrl1'
});

const SC_ENDPOINT = new Endpoint(EndpointType.SonarCloud, { url: 'https://endpoint.url' });
const SQ_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: 'https://endpoint.url' });
const METRICS = new Metrics([]);

it('should fail unless SONARQUBE_SCANNER_PARAMS are supplied', async () => {
  jest.spyOn(tl, 'getVariable').mockImplementation(() => null);
  jest.spyOn(tl, 'setResult').mockImplementation(() => null);

  await publishTask.default(EndpointType.SonarCloud);

  expect(tl.getVariable).toBeCalledWith('SONARQUBE_SCANNER_PARAMS');
  expect(tl.setResult).toBeCalledWith(
    tl.TaskResult.Failed,
    'The SonarCloud Prepare Analysis Configuration must be added.'
  );
});

it('get report string for single report', async () => {
  // Mock waiting for the ceTask to complete and return a Task
  const returnedTask = new Task({
    analysisId: '123',
    componentKey: 'key',
    status: 'status',
    type: EndpointType.SonarQube,
    componentName: 'componentName'
  });
  jest.spyOn(Task, 'waitForTaskCompletion').mockImplementation(() => returnedTask);

  // Mock converting the Task into an html report
  const returnedAnalysis = new Analysis(
    { status: '', conditions: [] },
    EndpointType.SonarCloud,
    '',
    null,
    null
  );
  jest.spyOn(Analysis, 'getAnalysis').mockImplementation(() => returnedAnalysis);
  jest.spyOn(returnedAnalysis, 'getHtmlAnalysisReport').mockImplementation(() => 'dummy html');

  const result = await publishTask.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);

  expect(Task.waitForTaskCompletion).toHaveBeenCalledWith(SQ_ENDPOINT, TASK_REPORT.ceTaskId, 999);
  expect(Analysis.getAnalysis).toBeCalledWith({
    analysisId: '123',
    dashboardUrl: 'http://dashboardurl1',
    endpoint: SQ_ENDPOINT,
    metrics: { metrics: [] },
    projectName: 'componentName'
  });

  expect(result).toBe('dummy html');
});

it('get report string should return undefined if ceTask times out', async () => {
  // Mock the ceTask timing out
  jest.spyOn(Task, 'waitForTaskCompletion').mockImplementation(() => {
    throw new TimeOutReachedError();
  });
  jest.spyOn(Analysis, 'getAnalysis');
  jest.spyOn(tl, 'warning').mockImplementation(() => null);

  const result = await publishTask.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);

  expect(result).toBeUndefined();
  expect(Task.waitForTaskCompletion).toHaveBeenCalledWith(SQ_ENDPOINT, TASK_REPORT.ceTaskId, 999);
  expect(tl.warning).toBeCalledWith(
    "Task '111' takes too long to complete. Stopping after 999s of polling. No quality gate will be displayed on build result."
  );
  expect(Analysis.getAnalysis).not.toBeCalled();
});

it('get report string should fail for non-timeout errors', async () => {
  // Mock the ceTask timing out
  jest.spyOn(Task, 'waitForTaskCompletion').mockImplementation(() => {
    throw new InvalidApiResourceVersionError('my error');
  });
  jest.spyOn(Analysis, 'getAnalysis');
  jest.spyOn(tl, 'warning').mockImplementation(() => null);

  expect.assertions(1);
  try {
    await publishTask.getReportForTask(TASK_REPORT, METRICS, SQ_ENDPOINT, 999);
  } catch (e) {
    expect(e).toEqual({ message: 'my error', name: 'Invalid resource version' });
  }
});

it('task should not fail the task even if all ceTasks timeout', async () => {
  const taskReport2 = new TaskReport({
    ceTaskId: '222',
    ceTaskUrl: 'http://taskurl2',
    dashboardUrl: 'http://dashboardurl2',
    projectKey: 'projectKey2',
    serverUrl: 'http:/serverUrl2'
  });

  jest.spyOn(tl, 'getInput').mockImplementation(() => '1'); // set the timeout
  jest.spyOn(tl, 'setResult');
  jest.spyOn(tl, 'debug').mockImplementation(() => null);
  jest.spyOn(tl, 'warning').mockImplementation(() => null);

  tl.setVariable('SONARQUBE_SCANNER_PARAMS', 'anything...');
  tl.setVariable('SONARQUBE_ENDPOINT', SC_ENDPOINT.toJson());

  // Mock finding two report files to process
  jest
    .spyOn(TaskReport, 'createTaskReportsFromFiles')
    .mockImplementation(() => [TASK_REPORT, taskReport2]);

  jest.spyOn(Task, 'waitForTaskCompletion').mockImplementation(() => {
    throw new TimeOutReachedError();
  });
  const publishSummaryMock = jest
    .spyOn(serverUtils, 'publishBuildSummary')
    .mockImplementation(() => null);

  await publishTask.default(EndpointType.SonarCloud);

  expect(serverUtils.publishBuildSummary).toHaveBeenCalledTimes(1);
  expect(publishSummaryMock.mock.calls[0][1]).toBe(EndpointType.SonarCloud);
  expect(tl.setResult).not.toBeCalledWith(tl.TaskResult.Failed);

  expect(serverUtils.publishBuildSummary).toBeCalledWith('\r\n', EndpointType.SonarCloud);

  expect(tl.warning).toBeCalledWith(
    "Task '111' takes too long to complete. Stopping after 1s of polling. No quality gate will be displayed on build result."
  );
  expect(tl.warning).toBeCalledWith(
    "Task '222' takes too long to complete. Stopping after 1s of polling. No quality gate will be displayed on build result."
  );
});
