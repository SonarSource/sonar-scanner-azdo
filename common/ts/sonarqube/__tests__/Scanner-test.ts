import Scanner, { ScannerCLI, ScannerMode } from '../Scanner';

jest.mock('azure-pipelines-task-lib/task', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

it('should return formated argument string for CLI with file mode', () => {
  const scanner = new ScannerCLI(__dirname, { projectSettings: 'DummyScanner.properties' }, 'file');

  const actual = scanner.toCliProps();

  expect(actual).toBe('-Dproject.settings=DummyScanner.properties');
});

it('should return formated argument string for CLI with manual mode', () => {
  const scanner = new ScannerCLI(__dirname, { projectKey: 'myprojectKey' }, 'manual');

  const actual = scanner.toCliProps();

  expect(actual).toBe(
    '-Dsonar.projectKey=myprojectKey -Dsonar.projectName=undefined -Dsonar.projectVersion=undefined -Dsonar.sources=undefined'
  );
});

it('should return empty string for default scanner mode', () => {
  const scanner = new Scanner(__dirname, ScannerMode.CLI);

  const actual = scanner.toCliProps();

  expect(actual).toBe('');
});
