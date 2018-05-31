import { writeFileSync } from 'fs';
import { fileSync } from 'tmp'; // eslint-disable-line import/no-extraneous-dependencies
import TaskReport from '../TaskReport';

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
