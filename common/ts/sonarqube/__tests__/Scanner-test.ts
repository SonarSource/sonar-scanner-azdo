import * as tl from 'azure-pipelines-task-lib/task';
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import Scanner, { ScannerCLI, ScannerMode, ScannerMSBuild } from '../Scanner';

beforeEach(() => {
  jest.restoreAllMocks();
});

it('getAnalyzeScanner_should_return_proper_scanner', () => {
  let scanner = Scanner.getAnalyzeScanner('', ScannerMode.CLI);
  expect(scanner).toBeInstanceOf(ScannerCLI);

  scanner = Scanner.getAnalyzeScanner('', ScannerMode.MSBuild);
  expect(scanner).toBeInstanceOf(ScannerMSBuild);

  scanner = Scanner.getAnalyzeScanner('', ScannerMode.Other);
  expect(scanner).toBeInstanceOf(Scanner);
});

it('getPrepareScanner_should_return_proper_scanner', () => {
  jest.spyOn(tl, 'getInput').mockImplementation(() => 'dummy');

  let scanner = Scanner.getPrepareScanner('', ScannerMode.CLI);
  expect(scanner).toBeInstanceOf(ScannerCLI);

  scanner = Scanner.getPrepareScanner('', ScannerMode.MSBuild);
  expect(scanner).toBeInstanceOf(ScannerMSBuild);

  scanner = Scanner.getPrepareScanner('', ScannerMode.Other);
  expect(scanner).toBeInstanceOf(Scanner);
});

it('ScannerCLI_toSonarProps_with_file_should_return_properties_path', () => {
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'file'); //configMode
  jest
    .spyOn(tl, 'getInput')
    .mockImplementationOnce(() => '/home/user/azure/repo/source/sonar-project.properties'); //configFile

  const scanner = Scanner.getPrepareScanner('', ScannerMode.CLI);

  const sonarProps = scanner.toSonarProps();
  expect(sonarProps).toStrictEqual({
    'project.settings': '/home/user/azure/repo/source/sonar-project.properties',
  });
});

it('ScannerCLI_toSonarProps_with_properties_should_return_properties', () => {
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'manual'); //configMode
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'my_project_key'); //cliProjectKey
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'MyProject'); //cliProjectName
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'v1.0'); //cliProjectVersion
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => '.'); //cliSources

  const scanner = Scanner.getPrepareScanner('', ScannerMode.CLI);

  const sonarProps = scanner.toSonarProps();
  expect(sonarProps).toStrictEqual({
    'sonar.projectKey': 'my_project_key',
    'sonar.projectName': 'MyProject',
    'sonar.projectVersion': 'v1.0',
    'sonar.sources': '.',
  });
});

it('ScannerCLI_run_analysis_on_windows_with_debug_should_append_bat_to_scanner', async () => {
  const rootPath = __dirname;
  const scannerExec = 'dummy';
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'file'); //configMode
  jest
    .spyOn(tl, 'getInput')
    .mockImplementationOnce(() => '/home/user/azure/repo/source/sonar-project.properties'); //configFile
  const scanner = Scanner.getAnalyzeScanner(rootPath, ScannerMode.CLI);

  jest.spyOn(tl, 'resolve').mockImplementationOnce(() => rootPath + '/' + scannerExec);
  jest.spyOn(tl, 'getPlatform').mockImplementationOnce(() => tl.Platform.Windows);
  jest.spyOn(tl, 'getVariable').mockImplementation(() => 'true'); //Debug mode

  jest
    .spyOn(tl, 'tool')
    .mockImplementationOnce(() => new ToolRunner(rootPath + '/' + scannerExec + '.bat'));

  await scanner.runAnalysis();

  expect(tl.tool).toHaveBeenCalledWith(rootPath + '/' + scannerExec + '.bat');
});

it('ScannerCLI_run_analysis_on_linux_without_debug_should_not_append_bat_nor_X', async () => {
  const rootPath = __dirname;
  const scannerExec = 'dummy';
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'file'); //configMode
  jest
    .spyOn(tl, 'getInput')
    .mockImplementationOnce(() => '/home/user/azure/repo/source/sonar-project.properties'); //configFile
  const scanner = Scanner.getAnalyzeScanner(rootPath, ScannerMode.CLI);

  jest.spyOn(tl, 'resolve').mockImplementationOnce(() => rootPath + '/' + scannerExec);
  jest.spyOn(tl, 'getPlatform').mockImplementationOnce(() => tl.Platform.Linux);
  jest.spyOn(tl, 'getVariable').mockImplementation(() => 'true'); //Debug mode

  const toolRunner = new ToolRunner(rootPath + '/' + scannerExec);
  jest.spyOn(tl, 'tool').mockImplementationOnce(() => toolRunner);

  await scanner.runAnalysis();

  expect(tl.tool).toHaveBeenCalledWith(rootPath + '/' + scannerExec);
});

it('ScannerMsBuild_run_analysis_on_windows_with_debug_should_add_exe_link', () => {
  const rootPath = __dirname;
  const scannerExec = 'dummy';
  jest.spyOn(tl, 'getInput').mockImplementationOnce(() => 'file'); //configMode
  jest
    .spyOn(tl, 'getInput')
    .mockImplementationOnce(() => '/home/user/azure/repo/source/sonar-project.properties'); //configFile
  const scanner = Scanner.getAnalyzeScanner(rootPath, ScannerMode.MSBuild);

  jest.spyOn(tl, 'resolve').mockImplementationOnce(() => rootPath + '/' + scannerExec);
  jest.spyOn(tl, 'getPlatform').mockImplementationOnce(() => tl.Platform.Windows);
  jest.spyOn(tl, 'getVariable').mockImplementation(() => 'true'); //Debug mode

  const toolRunner = new ToolRunner(rootPath + '/' + scannerExec + '.bat');
  jest.spyOn(tl, 'tool').mockImplementationOnce(() => toolRunner);

  scanner.runAnalysis();

  expect(tl.tool).toHaveBeenCalledWith('SONAR_SCANNER_DOTNET_PATH/SonarScanner.MSBuild.exe');
});
