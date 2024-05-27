import * as tl from "azure-pipelines-task-lib/task";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { Guid } from "guid-typescript";
import * as path from "path";
import { SemVer } from "semver";
import * as request from "../helpers/request";
import * as prept from "../prepare-task";
import Endpoint, { EndpointType } from "../sonarqube/Endpoint";
import TaskReport from "../sonarqube/TaskReport";
import Scanner, { ScannerCLI, ScannerMode, ScannerMSBuild } from "../sonarqube/Scanner";
import { JdkVersionSource, TaskVariables } from "../helpers/constants";
import { scanner as scannerConfig } from "../config";

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("branchFeatureSupported", () => {
  it.each([
    [new Endpoint(EndpointType.SonarCloud, { url: "https://sonarcloud.io" }), "SC", "1.2.3", true],
    [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "SQ", "7.1.0", false],
    [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "SQ", "9.9.0", true],
    [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "SQ", "10.0.0", true],
    [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "SQ", "10.1.0", true],
    [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "SQ", "11.0.0", true],
    [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "SQ", "12.0.0", true],
  ])(
    "branch feature is supported for %p %p %p",
    async (
      endpoint: Endpoint,
      product: string,
      version: string,
      expectedBranchSupported: Boolean,
    ) => {
      tl.debug(`${product} ${version}`);
      jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer(version));
      const actual = await prept.branchFeatureSupported(endpoint, version);
      expect(actual).toBe(expectedBranchSupported);
    },
  );
});

it("should build report task path from variables", () => {
  const reportDirectory = path.join("C:", "temp", "dir");
  const sonarSubDirectory = "sonar";
  const buildId = "1";

  const guid = Guid.create();

  jest.spyOn(Guid, "create").mockImplementation(() => guid);

  const reportFullPath = path.join(
    reportDirectory,
    sonarSubDirectory,
    buildId,
    guid.toString(),
    "report-task.txt",
  );

  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => reportDirectory);
  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => buildId);

  const actual = TaskReport.getDefaultPath();

  expect(actual).toEqual(reportFullPath);
});

describe("downloading the scanner", () => {
  beforeEach(() => {
    jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
    jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer("10.5.0"));
    jest.spyOn(TaskReport, "getDefaultPath").mockReturnValue("report-task.txt");
    jest.spyOn(toolLib, "downloadTool").mockResolvedValue("path/to/zip-scanner");
    jest.spyOn(toolLib, "extractZip").mockResolvedValue("path/to/unzip-scanner");
    jest.spyOn(tl, "setVariable");
  });

  it("should download the default version of the scanner", async () => {
    //JAVA_HOME
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => JdkVersionSource.JavaHome);
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "mock-organization");
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.msBuildVersion); // MSBuildVersion Default
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.cliVersion); // CliVersion Default
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => ScannerMode.CLI); // CLI Mode
    const scannerCLI = new ScannerCLI(__dirname, { projectSettings: "scanner.properties" });

    jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scannerCLI);

    await prept.prepareTask(EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).toHaveBeenCalledWith(
      `https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${scannerConfig.cliVersion}.zip`,
    );
    expect(toolLib.extractZip).toHaveBeenCalledWith("path/to/zip-scanner");
    expect(tl.setVariable).toHaveBeenCalledWith(
      TaskVariables.SonarQubeScannerLocation,
      "path/to/unzip-scanner",
    );

    jest.spyOn(tl, "getInput").mockImplementationOnce(() => JdkVersionSource.JavaHome);
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "mock-organization");
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.msBuildVersion); // MSBuildVersion Default
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.cliVersion); // CliVersion Default
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => ScannerMode.MSBuild); // MSBuild Mode
    jest.spyOn(ScannerMSBuild.prototype, "runPrepare").mockImplementation(() => Promise.resolve());

    const scannerMSBUILD = new ScannerMSBuild(__dirname, {});
    jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scannerMSBUILD);

    await prept.prepareTask(EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).toHaveBeenCalledWith(
      `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${scannerConfig.msBuildVersion}/sonar-scanner-${scannerConfig.msBuildVersion}-net.zip`,
    );
    expect(toolLib.extractZip).toHaveBeenCalledWith("path/to/zip-scanner");
    expect(tl.setVariable).toHaveBeenCalledWith(
      TaskVariables.SonarQubeScannerLocation,
      "path/to/unzip-scanner",
    );
  });

  it("should download a configured version of the msbuild scanner for unix", async () => {
    //JAVA_HOME
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => JdkVersionSource.JavaHome);
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "mock-organization");
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "6.0.0.1"); // MSBuildVersion
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.cliVersion); // CliVersion Default
    jest.spyOn(tl, "getPlatform").mockReturnValue(tl.Platform.Linux);
    const scanner = new ScannerMSBuild(__dirname, {});

    jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scanner);

    jest.spyOn(ScannerMSBuild.prototype, "runPrepare").mockImplementation(() => Promise.resolve());

    await prept.prepareTask(EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).toHaveBeenCalledWith(
      "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/6.0.0.1/sonar-scanner-6.0.0.1-net.zip",
    );
    expect(toolLib.extractZip).toHaveBeenCalledWith("path/to/zip-scanner");
    expect(tl.setVariable).toHaveBeenCalledWith(
      TaskVariables.SonarQubeScannerLocation,
      "path/to/unzip-scanner",
    );
  });

  it("should download a configured version of the msbuild scanner for windows", async () => {
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => JdkVersionSource.JavaHome);
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "mock-organization");
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "6.0.0.1"); // MSBuildVersion
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.cliVersion); // CliVersion Default
    //windows
    jest.spyOn(tl, "getPlatform").mockReturnValue(tl.Platform.Windows);
    const scannerWindows = new ScannerMSBuild(__dirname, {});

    jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scannerWindows);
    jest.spyOn(ScannerMSBuild.prototype, "runPrepare").mockImplementation(() => Promise.resolve());

    await prept.prepareTask(EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).toHaveBeenCalledWith(
      "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/6.0.0.1/sonar-scanner-6.0.0.1-net-framework.zip",
    );
    expect(toolLib.extractZip).toHaveBeenCalledWith("path/to/zip-scanner");
    expect(tl.setVariable).toHaveBeenCalledWith(
      TaskVariables.SonarQubeScannerLocation,
      "path/to/unzip-scanner",
    );
  });

  it("should download a configured version of the cli scanner", async () => {
    //JAVA_HOME
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => JdkVersionSource.JavaHome);
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "mock-organization");
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => scannerConfig.msBuildVersion); // MSBuild Default
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "5.0.0.1"); // CLI Version

    const scanner = new ScannerCLI(__dirname, { projectSettings: "scanner.properties" });

    jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scanner);

    await prept.prepareTask(EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).toHaveBeenCalledWith(
      "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.0.1.zip",
    );
    expect(toolLib.extractZip).toHaveBeenCalledWith("path/to/zip-scanner");
    expect(tl.setVariable).toHaveBeenCalledWith(
      TaskVariables.SonarQubeScannerLocation,
      "path/to/unzip-scanner",
    );
  });
});
