import * as path from "path";
import * as _ from "lodash";
import * as semver from "semver";
import * as fs from "fs-extra";
import * as tl from "azure-pipelines-task-lib/task";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { getJSON } from "../helpers/request";
import { PROP_NAMES, isWindows } from "../helpers/utils";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";
import Endpoint, { EndpointType } from "./Endpoint";

export enum ScannerMode {
  MSBuild = "MSBuild",
  CLI = "CLI",
  Other = "Other",
}

export default class Scanner {
  constructor(public rootPath: string, public mode: ScannerMode) {}

  //MMF-2035
  private static isSonarCloud: boolean;

  public static setIsSonarCloud(value: boolean) {
    this.isSonarCloud = value;
  }

  public static getIsSonarCloud(): boolean {
    return this.isSonarCloud;
  }
  //MMF-2035

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
        return new ScannerMSBuild(rootPath, {});
      case ScannerMode.CLI:
        return new ScannerCLI(rootPath, {});
      default:
        throw new Error(`[SQ] Unknown scanner mode: ${mode}`);
    }
  }

  logIssueOnBuildSummaryForStdErr(tool) {
    tool.on("stderr", (data) => {
      if (data == null) {
        return;
      }
      data = data.toString().trim();
      if (data.indexOf("WARNING: An illegal reflective access operation has occurred") !== -1) {
        //bypass those warning showing as error because they can't be catched for now by Scanner.
        tl.debug(data);
        return;
      }
      tl.command("task.logissue", { type: "error" }, data);
    });
  }

  //Temporary warning message for Java version (MMF-2035)
  logIssueAsWarningForStdOut(tool) {
    tool.on("stdout", (data) => {
      if (data == null) {
        return;
      }
      data = data.toString().trim();
      if (data.indexOf("Please update to at least Java 11") !== -1 && Scanner.getIsSonarCloud()) {
        tl.command("task.logissue", { type: "warning" }, data);
      }
    });
  }
  //Temporary warning message for Java version (MMF-2035)

  isDebug() {
    return tl.getVariable("system.debug") === "true";
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
  constructor(rootPath: string, private readonly data: ScannerCLIData, private cliMode?: string) {
    super(rootPath, ScannerMode.CLI);
  }

  public toSonarProps() {
    if (this.cliMode === "file") {
      return { [PROP_NAMES.PROJECTSETTINGS]: this.data.projectSettings };
    }
    return {
      [PROP_NAMES.PROJECTKEY]: this.data.projectKey,
      [PROP_NAMES.PROJECTNAME]: this.data.projectName,
      [PROP_NAMES.PROJECTVERSION]: this.data.projectVersion,
      [PROP_NAMES.PROJECTSOURCES]: this.data.projectSources,
    };
  }

  public async runAnalysis() {
    let scannerCliScript = tl.resolve(this.rootPath, "sonar-scanner", "bin", "sonar-scanner");

    if (isWindows()) {
      scannerCliScript += ".bat";
    } else {
      await fs.chmod(scannerCliScript, "777");
    }
    const scannerRunner = tl.tool(scannerCliScript);
    this.logIssueOnBuildSummaryForStdErr(scannerRunner);
    this.logIssueAsWarningForStdOut(scannerRunner);
    if (this.isDebug()) {
      scannerRunner.arg("-X");
    }
    await scannerRunner.exec();
  }

  public static getScanner(rootPath: string) {
    const mode = tl.getInput("configMode");
    if (mode === "file") {
      return new ScannerCLI(rootPath, { projectSettings: tl.getInput("configFile", true) }, mode);
    }
    return new ScannerCLI(
      rootPath,
      {
        projectKey: tl.getInput("cliProjectKey", true),
        projectName: tl.getInput("cliProjectName"),
        projectVersion: tl.getInput("cliProjectVersion"),
        projectSources: tl.getInput("cliSources"),
      },
      mode
    );
  }
}

interface ScannerMSData {
  projectKey?: string;
  projectName?: string;
  projectVersion?: string;
  organization?: string;
}

export class ScannerMSBuild extends Scanner {
  readonly SCANNER_LATEST_RELEASE_URL =
    "https://api.github.com/repos/SonarSource/sonar-scanner-msbuild/releases/latest";
  readonly SCANNER_PATH_VARIABLE = "SONAR_SCANNER_DOTNET_PATH";
  readonly SCANNER_USE_DLL_VERSION = "SONAR_SCANNER_DOTNET_USE_DLL_VERSION";
  readonly MIN_DOTNET_MAJOR_VERSION = 2;
  //Update this max once a new major release of dotnet / S4DN is made
  readonly MAX_DOTNET_MAJOR_VERSION = 5;

  constructor(rootPath: string, private readonly data: ScannerMSData) {
    super(rootPath, ScannerMode.MSBuild);
  }

  public toSonarProps() {
    return {
      [PROP_NAMES.PROJECTKEY]: this.data.projectKey,
      [PROP_NAMES.PROJECTNAME]: this.data.projectName,
      [PROP_NAMES.PROJECTVERSION]: this.data.projectVersion,
    };
  }

  public async runPrepare() {
    let scannerRunner;

    if (isWindows()) {
      const useDllVersion = tl.getVariable(this.SCANNER_USE_DLL_VERSION);
      if (!useDllVersion) {
        const releaseUrl = this.getLatestReleaseUrl("net46");
        tl.debug(`Fetched latest release url : ${releaseUrl}`)
        const scannerExePath = await this.downloadAndCacheScanner(releaseUrl);



        const scannerExePath = this.findFrameworkScannerPath();
        tl.debug(`Using classic scanner at ${scannerExePath}`);
        tl.setVariable(this.SCANNER_PATH_VARIABLE, scannerExePath);
        scannerRunner = this.getScannerRunner(scannerExePath, true);
      }
    } else {
      const scannerDllPath = this.findDotnetScannerPath();
      tl.debug(`Using dotnet scanner at ${scannerDllPath}`);
      tl.setVariable(this.SCANNER_PATH_VARIABLE, scannerDllPath);
      scannerRunner = this.getScannerRunner(scannerDllPath, false);

      // Need to set executable flag on the embedded scanner CLI
      await this.makeShellScriptExecutable(scannerDllPath);
    }
    scannerRunner.arg("begin");
    scannerRunner.arg("/k:" + this.data.projectKey);
    if (this.data.organization) {
      scannerRunner.arg("/o:" + this.data.organization);
    }
    this.logIssueOnBuildSummaryForStdErr(scannerRunner);
    this.logIssueAsWarningForStdOut(scannerRunner);
    if (this.isDebug()) {
      scannerRunner.arg("/d:sonar.verbose=true");
    }
    await scannerRunner.exec();
  }

  private async downloadAndCacheScanner(releaseUrl: string): Promise<string>{
      const temp: string = await toolLib.downloadTool(releaseUrl);
      const extractRoot: string = await toolLib.extractZip(temp);
      toolLib.prependPath(extractRoot);
      return extractRoot;
  }

  private getLatestReleaseUrl(tfm: string): any {
    const endpoint = new Endpoint(EndpointType.SonarQube, { url: this.SCANNER_LATEST_RELEASE_URL });
    getJSON(endpoint, "").then((payload: string) => {
      const asset = _.find(JSON.parse(payload).assets, (asset) =>
        String(asset.name).includes(tfm)
      );

      if (asset) {
        return asset.browser_download_url;
      }

      tl.warning("Could not fetch latest release url from GitHub.");
      return null;
    });

    return null;
  }

  private getDotnetMajorVersion(): number {
    tl.debug("Trying to fetch used dotnet version using dotnet --version.");
    var dotnetVersionRunner = this.getDotnetToolRunner();
    dotnetVersionRunner.arg("--version");
    var version = semver.parse(dotnetVersionRunner.execSync().stdout);
    if (version == null) {
      tl.warning("Could not fetch dotnet version");
      return null;
    }

    return version.major;
  }

  private getAndParseProvidedDotnetMajor(): number {
    var providedDotnetMajorVersion = tl.getVariable("SONAR_SCANNER_DOTNET_MAJOR_VERSION");
    if (providedDotnetMajorVersion) {
      tl.debug("Found a provided SONAR_SCANNER_DOTNET_MAJOR_VERSION variable, trying to parse it.");
      var intMajorversion = parseInt(providedDotnetMajorVersion);
      //Increase the max version each time a new major release of dotnet/ S4DN is done
      if (
        isNaN(intMajorversion) ||
        intMajorversion < this.MIN_DOTNET_MAJOR_VERSION ||
        intMajorversion > this.MAX_DOTNET_MAJOR_VERSION
      ) {
        tl.warning(`Failed to parse '${providedDotnetMajorVersion}' as a major version. 
        It should be either a number or between ${this.MIN_DOTNET_MAJOR_VERSION} and ${this.MAX_DOTNET_MAJOR_VERSION}.`);
        return null;
      }
      return intMajorversion;
    }
    tl.debug("No provided SONAR_SCANNER_DOTNET_MAJOR_VERSION variable found");
    return null;
  }

  private async makeShellScriptExecutable(scannerExecutablePath: string) {
    const scannerCliShellScripts = tl.findMatch(
      scannerExecutablePath,
      path.join(path.dirname(scannerExecutablePath), "sonar-scanner-*", "bin", "sonar-scanner")
    )[0];
    await fs.chmod(scannerCliShellScripts, "777");
  }

  private getScannerRunner(scannerPath: string, isExeScanner: boolean) {
    if (isExeScanner) {
      return tl.tool(scannerPath);
    }

    var scannerRunner = this.getDotnetToolRunner();
    scannerRunner.arg(scannerPath);
    return scannerRunner;
  }

  private getDotnetToolRunner(): ToolRunner {
    const dotnetToolPath = tl.which("dotnet", true);
    return tl.tool(dotnetToolPath);
  }

  private findFrameworkScannerPath(): string {
    return tl.resolve(this.rootPath, "classic-sonar-scanner-msbuild", "SonarScanner.MSBuild.exe");
  }

  private findDotnetScannerPath(): string {
    return tl.resolve(this.rootPath, "dotnet-sonar-scanner-msbuild", "SonarScanner.MSBuild.dll");
  }

  public async runAnalysis() {
    const scannerRunner = isWindows()
      ? this.getScannerRunner(tl.getVariable("SONARQUBE_SCANNER_MSBUILD_EXE"), true)
      : this.getScannerRunner(tl.getVariable("SONARQUBE_SCANNER_MSBUILD_DLL"), false);

    scannerRunner.arg("end");
    this.logIssueOnBuildSummaryForStdErr(scannerRunner);
    this.logIssueAsWarningForStdOut(scannerRunner);
    await scannerRunner.exec();
  }

  public static getScanner(rootPath: string) {
    return new ScannerMSBuild(rootPath, {
      projectKey: tl.getInput("projectKey", true),
      projectName: tl.getInput("projectName"),
      projectVersion: tl.getInput("projectVersion"),
      organization: tl.getInput("organization"),
    });
  }
}
