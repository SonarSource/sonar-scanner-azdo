import * as tl from "azure-pipelines-task-lib/task";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import * as fs from "fs-extra";
import * as path from "path";
import { scanner as scannerConfig } from "../config";
import { PROP_NAMES, SCANNER_CLI_NAME, TaskVariables } from "../helpers/constants";
import { isWindows } from "../helpers/utils";

export enum ScannerMode {
  MSBuild = "MSBuild",
  CLI = "CLI",
  Other = "Other",
}

export default class Scanner {
  constructor(
    public rootPath: string,
    public mode: ScannerMode,
  ) {}

  //MMF-2035
  private static isSonarCloud: boolean;

  public static setIsSonarCloud(value: boolean) {
    this.isSonarCloud = value;
  }

  public static getIsSonarCloud(): boolean {
    return this.isSonarCloud;
  }

  static async downloadScanner(fileUrl: string) {
    try {
      tl.debug(`Downloading scanner from ${fileUrl}`);
      const downloadPath = await toolLib.downloadTool(fileUrl);
      tl.debug(`Downloaded: ${fileUrl} file to ${downloadPath}`);

      tl.debug(`Extracting ${downloadPath}`);
      const unzipPath = await toolLib.extractZip(downloadPath);
      tl.debug(`Unzipped file to ${unzipPath}`);

      return unzipPath;
    } catch (error) {
      if (error.message.includes("404")) {
        tl.setResult(
          tl.TaskResult.Failed,
          "The scanner version you are trying to download does not exist. Please check the version and try again.",
        );
      } else {
        tl.setResult(tl.TaskResult.Failed, error.message);
      }
      throw error;
    }
  }

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
            `'SonarQube' option in the Maven/Gradle task to run the scanner as part of the build.`,
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

  logIssueOnBuildSummaryForStdErr(tool: ToolRunner) {
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
  logIssueAsWarningForStdOut(tool: ToolRunner) {
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
  constructor(
    rootPath: string,
    private readonly data: ScannerCLIData,
    private readonly cliMode?: string,
  ) {
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

  /**
   * When using the CLI scanner, the prepare task does not run anything.
   * Instead, it downloads the SonarScanner CLI if not using the embedded one.
   */
  public async runPrepare() {
    const cliVersion = tl.getInput("cliVersion");
    if (!cliVersion) {
      // Delete variable (Needed if there are multiple sonar scans in the same pipeline)
      tl.setVariable(TaskVariables.SonarScannerLocation, "");
      return;
    }

    const downloadUrl = scannerConfig.cliUrlTemplate(cliVersion);
    const scannerArchivePath = await Scanner.downloadScanner(downloadUrl);
    const scannerPath = tl.resolve(
      scannerArchivePath,
      `sonar-scanner-${cliVersion}`,
      "bin",
      isWindows() ? `${SCANNER_CLI_NAME}.bat` : SCANNER_CLI_NAME,
    );
    tl.setVariable(TaskVariables.SonarScannerLocation, scannerPath);
  }

  public async runAnalysis() {
    const scannerPath =
      tl.getVariable(TaskVariables.SonarScannerLocation) ||
      tl.resolve(
        this.rootPath,
        "sonar-scanner",
        "bin",
        isWindows() ? `${SCANNER_CLI_NAME}.bat` : SCANNER_CLI_NAME,
      );
    tl.debug(`Using scanner at ${scannerPath}`);

    // Hotfix permissions on UNIX
    if (!isWindows()) {
      await fs.chmod(scannerPath, "777");
    }
    const scannerRunner = tl.tool(scannerPath);
    this.logIssueOnBuildSummaryForStdErr(scannerRunner);
    this.logIssueAsWarningForStdOut(scannerRunner);
    if (this.isDebug()) {
      scannerRunner.arg("-X");
    }
    await scannerRunner.execAsync();
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
      mode,
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
  constructor(
    rootPath: string,
    private readonly data: ScannerMSData,
  ) {
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
    // Assume that windws <=> using .NET Framework, but that may not be the case in the future
    //  as .NET Core is now supported on Windows
    const useNetFramework = isWindows();

    const msBuildVersion = tl.getInput("msBuildVersion");
    let scannerPath: string | undefined;
    if (msBuildVersion) {
      // Download the specified scanner version
      const downloadUrl = scannerConfig.msBuildUrlTemplate(msBuildVersion, useNetFramework);
      const scannerArchivePath = await Scanner.downloadScanner(downloadUrl);
      scannerPath = tl.resolve(
        scannerArchivePath,
        useNetFramework ? "SonarScanner.MSBuild.exe" : "SonarScanner.MSBuild.dll",
      );
      tl.setVariable(TaskVariables.SonarScannerLocation, scannerPath);
    } else {
      // If msbuild version is not set, use embedded scanner
      scannerPath = useNetFramework
        ? tl.resolve(this.rootPath, "classic-sonar-scanner-msbuild", "SonarScanner.MSBuild.exe")
        : tl.resolve(this.rootPath, "dotnet-sonar-scanner-msbuild", "SonarScanner.MSBuild.dll");
    }
    tl.setVariable(TaskVariables.SonarScannerLocation, scannerPath);

    tl.debug(`Using ${useNetFramework ? ".NET framework" : ".NET core"} scanner at ${scannerPath}`);
    tl.setVariable(
      useNetFramework ? TaskVariables.SonarScannerMSBuildExe : TaskVariables.SonarScannerMSBuildDll,
      scannerPath,
    );

    const scannerRunner = this.getScannerRunner(scannerPath, useNetFramework);
    // Need to set executable flag on the embedded scanner CLI
    await this.makeShellScriptExecutable(scannerPath);
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
    await scannerRunner.execAsync();
  }

  private async makeShellScriptExecutable(scannerExecutablePath: string) {
    if (isWindows()) {
      return;
    }

    const scannerCliShellScripts = tl.findMatch(
      scannerExecutablePath,
      path.join(path.dirname(scannerExecutablePath), "sonar-scanner-*", "bin", SCANNER_CLI_NAME),
    )[0];

    await fs.chmod(scannerCliShellScripts, "777");
  }

  private getScannerRunner(scannerPath: string, isExeScanner: boolean) {
    tl.debug(`Using scanner at ${scannerPath}`);

    if (isExeScanner) {
      return tl.tool(scannerPath);
    }

    const dotnetToolPath = tl.which("dotnet", true);
    const scannerRunner = tl.tool(dotnetToolPath);
    scannerRunner.arg(scannerPath);
    return scannerRunner;
  }

  public async runAnalysis() {
    // Assume that windws <=> using .NET Framework
    const useNetFramework = isWindows();

    const scannerRunner = this.getScannerRunner(
      tl.getVariable(
        useNetFramework
          ? TaskVariables.SonarScannerMSBuildExe
          : TaskVariables.SonarScannerMSBuildDll,
      ),
      useNetFramework,
    );
    scannerRunner.arg("end");
    this.logIssueOnBuildSummaryForStdErr(scannerRunner);
    this.logIssueAsWarningForStdOut(scannerRunner);
    await scannerRunner.execAsync();
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
