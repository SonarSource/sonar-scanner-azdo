import * as tl from 'vsts-task-lib/task';
import { PROP_NAMES } from './utils';

export enum ScannerMode {
  MSBuild = 'MSBuild',
  CLI = 'CLI',
  Other = 'Other'
}

export default class Scanner {
  constructor(public rootPath: string, public mode: ScannerMode) {}

  public toSonarProps() {
    return {};
  }

  public async runPrepare() {}

  public async runAnalysis() {}

  public static getScanner(rootPath: string) {
    return new Scanner(rootPath, ScannerMode.Other);
  }

  public static getPrepareScanner(rootPath: string, mode: ScannerMode) {
    switch (mode) {
      case ScannerMode.Other:
        return Scanner.getScanner(rootPath);
      case ScannerMode.MSBuild:
        return ScannerMSBuild.getScanner(rootPath);
      case ScannerMode.CLI:
        return ScannerCLI.getScanner(rootPath);
      default:
        throw new Error(`[SQ] Unknown scanner mode: ${mode}`);
    }
  }

  public static getAnalyzeScanner(rootPath: string, mode: ScannerMode) {
    switch (mode) {
      case ScannerMode.Other:
        tl.warning(
          `[SQ] When using Maven or Gradle, don't use the analyze task but instead tick the ` +
            `'SonarQube' option in the Maven/Gradle task to run the scanner as part of the build.`
        );
        return Scanner.getScanner(rootPath);
      case ScannerMode.MSBuild:
        return new ScannerMSBuild(rootPath);
      case ScannerMode.CLI:
        return new ScannerCLI(rootPath);
      default:
        throw new Error(`[SQ] Unknown scanner mode: ${mode}`);
    }
  }
}

interface ScannerCLIData {
  projectSettings?: string;
  projectKey?: string;
  projectName?: string;
  projectVersion?: string;
  projectSources?: string;
}

export class ScannerCLI extends Scanner {
  constructor(rootPath: string, private cliMode?: string, private data?: ScannerCLIData) {
    super(rootPath, ScannerMode.CLI);
  }

  public toSonarProps() {
    if (this.cliMode === 'file') {
      return { [PROP_NAMES.PROJECTSETTINGS]: this.data.projectSettings };
    }
    return {
      [PROP_NAMES.PROJECTKEY]: this.data.projectKey,
      [PROP_NAMES.PROJECTNAME]: this.data.projectName,
      [PROP_NAMES.PROJECTVERSION]: this.data.projectVersion,
      [PROP_NAMES.PROJECTSOURCES]: this.data.projectSources
    };
  }

  public async runAnalysis() {
    const isWindows = tl.osType().match(/^Win/);
    let scannerExe = tl.resolve(this.rootPath, 'sonar-scanner', 'bin', 'sonar-scanner');
    const scannerRunner = tl.tool(scannerExe);
    if (isWindows) {
      scannerExe += '.bat';
    }
    await scannerRunner.exec();
  }

  public static getScanner(rootPath: string) {
    const mode = tl.getInput('configMode');
    if (mode === 'file') {
      return new ScannerCLI(rootPath, mode, { projectSettings: tl.getInput('configFile', true) });
    }
    return new ScannerCLI(rootPath, mode, {
      projectKey: tl.getInput('cliProjectKey', true),
      projectName: tl.getInput('cliProjectName'),
      projectVersion: tl.getInput('cliProjectVersion'),
      projectSources: tl.getInput('cliSources')
    });
  }
}

interface ScannerMSData {
  projectKey: string;
  projectName?: string;
  projectVersion?: string;
}

export class ScannerMSBuild extends Scanner {
  constructor(rootPath: string, private data?: ScannerMSData) {
    super(rootPath, ScannerMode.MSBuild);
  }

  public toSonarProps() {
    return {
      [PROP_NAMES.PROJECTKEY]: this.data.projectKey,
      [PROP_NAMES.PROJECTNAME]: this.data.projectName,
      [PROP_NAMES.PROJECTVERSION]: this.data.projectVersion
    };
  }

  public async runPrepare() {
    const scannerExe = tl.resolve(
      this.rootPath,
      'sonar-scanner-msbuild',
      'SonarQube.Scanner.MSBuild.exe'
    );
    tl.setVariable('SONARQUBE_SCANNER_MSBUILD_EXE', scannerExe);
    const msBuildScannerRunner = tl.tool(scannerExe);
    msBuildScannerRunner.arg('begin');
    msBuildScannerRunner.arg('/k:' + this.data.projectKey);
    await msBuildScannerRunner.exec();
  }

  public async runAnalysis() {
    const scannerExe = tl.getVariable('SONARQUBE_SCANNER_MSBUILD_EXE');
    const msBuildScannerRunner = tl.tool(scannerExe);
    msBuildScannerRunner.arg('end');
    await msBuildScannerRunner.exec();
  }

  public static getScanner(rootPath: string) {
    return new ScannerMSBuild(rootPath, {
      projectKey: tl.getInput('msBuildProjectKey', true),
      projectName: tl.getInput('msBuildProjectName'),
      projectVersion: tl.getInput('msBuildProjectVersion')
    });
  }
}
