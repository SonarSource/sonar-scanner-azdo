import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import { Guid } from 'guid-typescript';
import { SemVer } from 'semver';
import { when } from 'jest-when';
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
  jest.spyOn(request, 'getServerVersion').mockResolvedValue(new SemVer('7.2.0'));

  jest.spyOn(prept, 'getDefaultBranch').mockResolvedValue('refs/heads/master');

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(tl.warning).toHaveBeenCalledWith(
    'There is a dedicated extension for SonarCloud: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud'
  );
});

it('should concat SONAR_SCANNER_OPTS with existing value', async () => {
  const scannerObject = new ScannerCLI(
    __dirname,
    {
      projectSettings: 'dummyProjectKey.properties'
    },
    'file'
  );

  const getInput = jest.spyOn(tl, 'getInput');
  when(getInput)
    .calledWith('configMode')
    .mockReturnValue('file');
  when(getInput)
    .calledWith('scannerMode')
    .mockReturnValue('CLI');

  jest.spyOn(Scanner, 'getPrepareScanner').mockImplementation(() => scannerObject);
  jest.spyOn(scannerObject, 'runPrepare').mockImplementation(() => null);
  jest.spyOn(request, 'getServerVersion').mockResolvedValue(new SemVer('7.2.0'));

  const getVariable = jest.spyOn(tl, 'getVariable');
  when(getVariable)
    .calledWith('SONAR_SCANNER_OPTS')
    .mockReturnValue('-Xmx512m');
  when(getVariable)
    .calledWith('Agent.TempDirectory')
    .mockReturnValue('');
  when(getVariable)
    .calledWith('Build.BuildNumber')
    .mockReturnValue('');

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(process.env.SONAR_SCANNER_OPTS).toBe(
    '"-Xmx512m -Dproject.settings="dummyProjectKey.properties""'
  );
});

it('should concat SONAR_SCANNER_OPTS with non existing value', async () => {
  const scannerObject = new ScannerCLI(
    __dirname,
    {
      projectSettings: 'dummyProjectKey.properties'
    },
    'file'
  );

  const getInput = jest.spyOn(tl, 'getInput');
  when(getInput)
    .calledWith('configMode')
    .mockReturnValue('file');
  when(getInput)
    .calledWith('scannerMode')
    .mockReturnValue('CLI');

  jest.spyOn(Scanner, 'getPrepareScanner').mockImplementation(() => scannerObject);
  jest.spyOn(scannerObject, 'runPrepare').mockImplementation(() => null);
  jest.spyOn(request, 'getServerVersion').mockResolvedValue(new SemVer('7.2.0'));

  const getVariable = jest.spyOn(tl, 'getVariable');
  when(getVariable)
    .calledWith('SONAR_SCANNER_OPTS')
    .mockReturnValue(null);
  when(getVariable)
    .calledWith('Agent.TempDirectory')
    .mockReturnValue('');
  when(getVariable)
    .calledWith('Build.BuildNumber')
    .mockReturnValue('');

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(process.env.SONAR_SCANNER_OPTS).toBe('"-Dproject.settings="dummyProjectKey.properties""');
});

it('should fill SONAR_SCANNER_OPTS environment variable', async () => {
  const scannerObject = new ScannerCLI(
    __dirname,
    {
      projectSettings: 'dummyProjectKey.properties'
    },
    'file'
  );

  const getInput = jest.spyOn(tl, 'getInput');
  when(getInput)
    .calledWith('configMode')
    .mockReturnValue('file');
  when(getInput)
    .calledWith('scannerMode')
    .mockReturnValue('CLI');

  jest.spyOn(Scanner, 'getPrepareScanner').mockImplementation(() => scannerObject);
  jest.spyOn(scannerObject, 'runPrepare').mockImplementation(() => null);
  jest.spyOn(request, 'getServerVersion').mockResolvedValue(new SemVer('7.2.0'));

  jest.spyOn(tl, 'getVariable').mockImplementation(() => '');

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(process.env.SONAR_SCANNER_OPTS).toBe('"-Dproject.settings="dummyProjectKey.properties""');
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
