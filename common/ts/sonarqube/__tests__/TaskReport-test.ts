import * as path from 'path';
import { writeFileSync } from 'fs';
import { fileSync } from 'tmp'; // eslint-disable-line import/no-extraneous-dependencies
import * as tl from 'azure-pipelines-task-lib/task';
import TaskReport from '../TaskReport';

beforeEach(() => {
  jest.restoreAllMocks();
});

it('should parse report-task.txt and preserve equals sign in url', async () => {
  const tmpReport = fileSync();
  writeFileSync(
    tmpReport.fd,
    `dashboardUrl=http://sonar/bar?toto=titi&foo=%2Esomething
projectKey=myProjectKey
ceTaskId=12345
serverUrl=http://sonar`,
    {
      encoding: 'utf-8'
    }
  );

  const reports = await TaskReport.createTaskReportsFromFiles([tmpReport.name]);

  expect(reports).toHaveLength(1);
  const report = reports[0];
  expect(report.dashboardUrl).toBe('http://sonar/bar?toto=titi&foo=%2Esomething');

  tmpReport.removeCallback();
});

it('should parse all reports', async () => {
  const tmpReport = fileSync();
  writeFileSync(
    tmpReport.fd,
    `dashboardUrl=http://sonar/bar?toto=titi&foo=%2Esomething
projectKey=projectKey1
ceTaskId=12345
serverUrl=http://sonar`,
    {
      encoding: 'utf-8'
    }
  );

  const tmpReport2 = fileSync();
  writeFileSync(
    tmpReport2.fd,
    `dashboardUrl=http://sonar/bar?toto=titi&foo=%2Esomething
projectKey=projectKey2
ceTaskId=12345
serverUrl=http://sonar`,
    {
      encoding: 'utf-8'
    }
  );

  const reports = await TaskReport.createTaskReportsFromFiles([tmpReport.name, tmpReport2.name]);

  expect(reports).toHaveLength(2);
  expect(reports[0].projectKey).toBe('projectKey1');
  expect(reports[1].projectKey).toBe('projectKey2');

  tmpReport.removeCallback();
  tmpReport2.removeCallback();
});

it('should find report files', async () => {
  // using spyOn so we can reset the original behaviour
  jest.spyOn(tl, 'getVariable').mockImplementation(() => 'mock root search path');
  jest.spyOn(tl, 'findMatch').mockImplementation(() => ['path1', 'path2']);

  const reportFiles = await TaskReport.findTaskFileReport();

  expect(reportFiles.length).toBe(2);
  expect(reportFiles[0]).toBe('path1');
  expect(reportFiles[1]).toBe('path2');

  expect(tl.getVariable).toHaveBeenCalledTimes(2);
  expect(tl.getVariable).toBeCalledWith('Agent.TempDirectory');

  // Calculate the expected path to take account of different
  // path separators in Windows/non-Windows
  const expectedSearchPath = path.join(
    tl.getVariable('Build.BuildNumber'),
    '**',
    'report-task.txt'
  );
  expect(tl.findMatch).toHaveBeenCalledTimes(1);
  expect(tl.findMatch).toHaveBeenCalledWith('mock root search path', expectedSearchPath);
});
