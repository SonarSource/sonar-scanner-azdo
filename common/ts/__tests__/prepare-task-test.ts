import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import { Guid } from 'guid-typescript';
import Endpoint, { EndpointType } from '../sonarqube/Endpoint';
import * as prept from '../prepare-task';
import * as request from '../helpers/request';
import Scanner, { ScannerMSBuild, ScannerCLI } from '../sonarqube/Scanner';

beforeEach(() => {
  jest.restoreAllMocks();
});

const SQ_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: 'https://sonarqube.com' });

it('should display warning for dedicated extension for Sonarcloud', async () => {
  const scannerObject = new ScannerMSBuild(__dirname, {
    projectKey: 'dummyProjectKey',
    projectName: 'dummyProjectName',
    projectVersion: 'dummyProjectVersion',
    organization: 'dummyOrganization'
  });

  jest.spyOn(tl, 'getVariable').mockImplementation(() => '');
  jest.spyOn(tl, 'warning').mockImplementation(() => null);
  jest.spyOn(Scanner, 'getPrepareScanner').mockImplementation(() => scannerObject);
  jest.spyOn(scannerObject, 'runPrepare').mockImplementation(() => null);
  jest.spyOn(request, 'getServerVersion').mockImplementation(() => '7.0.0');
  jest.spyOn(prept, 'getDefaultBranch').mockImplementation(() => 'refs/heads/master');

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(tl.warning).toHaveBeenCalledWith(
    'There is a dedicated extension for SonarCloud: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud'
  );
});

it('should fill SONAR_SCANNER_OPTS environment variable', async () => {
  const scannerObject = new ScannerCLI(
    __dirname,
    {
      projectSettings: 'dummyProjectKey.properties'
    },
    'file'
  );

  jest.spyOn(tl, 'getInput').mockImplementation(() => 'CLI');
  jest.spyOn(Scanner, 'getPrepareScanner').mockImplementation(() => scannerObject);
  jest.spyOn(scannerObject, 'runPrepare').mockImplementation(() => null);
  jest.spyOn(request, 'getServerVersion').mockImplementation(() => '7.2.0');

  jest.spyOn(tl, 'getVariable').mockImplementation(() => '');

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(process.env.SONAR_SCANNER_OPTS).toBe('-Dproject.settings=dummyProjectKey.properties');
});

it('should build report task path from variables', () => {
  const reportDirectory = path.join('C:', 'temp', 'dir');
  const sonarSubDirectory = 'sonar';
  const buildNumber = '20250909.1';

  const guid = Guid.create();

  jest.spyOn(Guid, 'create').mockImplementation(() => guid);

  const reportFullPath = path.join(
    reportDirectory,
    sonarSubDirectory,
    buildNumber,
    guid.toString(),
    'report-task.txt'
  );

  jest.spyOn(tl, 'getVariable').mockImplementationOnce(() => reportDirectory);
  jest.spyOn(tl, 'getVariable').mockImplementationOnce(() => buildNumber);

  const actual = prept.reportPath();

  expect(actual).toEqual(reportFullPath);
});
