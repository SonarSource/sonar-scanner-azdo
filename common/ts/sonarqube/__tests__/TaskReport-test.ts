import { writeFileSync } from 'fs';
import { fileSync } from 'tmp'; // eslint-disable-line import/no-extraneous-dependencies
import * as tl from 'vsts-task-lib/task';
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
  const findMatchMock = jest.spyOn(tl, 'findMatch').mockImplementation(() => ['path1', 'path2']);

  const reportFiles = await TaskReport.findTaskFileReport();

  expect(reportFiles.length).toBe(2);
  expect(reportFiles[0]).toBe('path1');
  expect(reportFiles[1]).toBe('path2');

  expect(tl.getVariable).toHaveBeenCalledTimes(1);
  expect(tl.getVariable).toBeCalledWith('Agent.BuildDirectory');

  expect(tl.findMatch).toHaveBeenCalledTimes(1);
  expect(findMatchMock.mock.calls[0][0]).toBe('mock root search path');

  // Match using a regular expression to take account of the different
  // path separators used by "join" on Windows/non-Windows
  const regEx = new RegExp(/^\*\*[\\/]report-task.txt$/);
  expect(findMatchMock.mock.calls[0][1]).toMatch(regEx);
});
