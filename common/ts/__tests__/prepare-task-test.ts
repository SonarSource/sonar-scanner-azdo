import * as tl from 'azure-pipelines-task-lib/task';
import Endpoint, { EndpointType } from '../sonarqube/Endpoint';
import * as prept from '../prepare-task';
import * as request from '../helpers/request';
import  Scanner, { ScannerMSBuild } from '../sonarqube/Scanner';

beforeEach(() => {
    jest.restoreAllMocks();
});

const SQ_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: 'https://sonarqube.com' });

it('should display warning for dedicated extension for Sonarcloud', async () => {

let scannerObject =  new ScannerMSBuild(__dirname, {
    projectKey: 'dummyProjectKey',
    projectName: 'dummyProjectName',
    projectVersion: 'dummyProjectVersion',
    organization: 'dummyOrganization'
  });

jest.spyOn(tl, 'getVariable').mockImplementation(() => null);
jest.spyOn(tl, 'warning').mockImplementation(() => null);
jest.spyOn(Scanner, 'getPrepareScanner').mockImplementation(() => scannerObject);
jest.spyOn(scannerObject, 'runPrepare').mockImplementation(() => null);
jest.spyOn(request, 'getServerVersion').mockImplementation(() => '7.0.0');

 await prept.default(SQ_ENDPOINT, __dirname);

expect(tl.warning).toHaveBeenCalledWith('There is a dedicated extension for SonarCloud: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud');
});