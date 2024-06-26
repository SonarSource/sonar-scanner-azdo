import * as tl from "azure-pipelines-task-lib/task";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { Guid } from "guid-typescript";
import * as path from "path";
import { SemVer } from "semver";
import { JdkVersionSource } from "../helpers/constants";
import * as request from "../helpers/request";
import { AzureTaskLibMock } from "../mocks/AzureTaskLibMock";
import { AzureToolLibMock } from "../mocks/AzureToolLibMock";
import * as prept from "../prepare-task";
import Endpoint, { EndpointType } from "../sonarqube/Endpoint";
import Scanner, { ScannerCLI, ScannerMSBuild, ScannerMode } from "../sonarqube/Scanner";
import TaskReport from "../sonarqube/TaskReport";

jest.mock("azure-pipelines-task-lib/task");
jest.mock("azure-pipelines-tool-lib/tool");

jest.mock("fs-extra", () => ({
  ...jest.requireActual("fs-extra"),
  chmod: jest.fn(),
}));

const azureTaskLibMock = new AzureTaskLibMock();
const azureToolLibMock = new AzureToolLibMock();

beforeEach(() => {
  jest.restoreAllMocks();
  azureTaskLibMock.reset();
  azureToolLibMock.reset();
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

  it.each([
    [
      ScannerMode.CLI,
      "6.0.0.1",
      "5.0.0.1",
      "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.0.1.zip",
    ],
    [ScannerMode.CLI, "6.0.0.1", undefined, null],
    [
      ScannerMode.MSBuild,
      "6.0.0.1",
      "5.0.0.1",
      `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/6.0.0.1/sonar-scanner-6.0.0.1-net.zip`,
    ],
    [ScannerMode.MSBuild, undefined, "5.0.0.1", null],
  ])(
    "should download the correct version of the %s scanner",
    async (scannerMode, msBuildVersion, cliVersion, url) => {
      azureTaskLibMock.setInputs({
        SonarQube: "SQ",
        jdkversion: JdkVersionSource.JavaHome,
        organization: "mock-organization",
        msBuildVersion,
        cliVersion,
        scannerMode,
      });

      const mockedScanner =
        scannerMode === ScannerMode.CLI
          ? new ScannerCLI(__dirname, { projectSettings: "scanner.properties" })
          : new ScannerMSBuild(__dirname, {});
      jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => mockedScanner);

      await prept.prepareTask(EndpointType.SonarQube);

      expect(Scanner.getPrepareScanner).toHaveBeenCalled();
      if (url) {
        expect(toolLib.downloadTool).toHaveBeenCalledWith(url);
        expect(toolLib.extractZip).toHaveBeenCalledWith("path/to/zip-scanner");
      } else {
        expect(toolLib.downloadTool).not.toHaveBeenCalled();
        expect(toolLib.extractZip).not.toHaveBeenCalled();
      }
    },
  );

  it("should give the user a useful message when the version is not found", async () => {
    const errorResponse = "HTTP status code 404";

    azureTaskLibMock.setInputs({
      SonarQube: "SQ",
      jdkversion: JdkVersionSource.JavaHome,
      organization: "mock-organization",
      msBuildVersion: "6.0.0.1",
      cliVersion: "5.0.0.1",
      scannerMode: ScannerMode.CLI,
    });

    jest.spyOn(toolLib, "downloadTool").mockRejectedValue(new Error(errorResponse));
    jest.spyOn(tl, "setResult").mockImplementation(() => null);

    await expect(prept.prepareTask(EndpointType.SonarQube)).rejects.toThrow(errorResponse);

    expect(tl.setResult).toHaveBeenCalledWith(
      tl.TaskResult.Failed,
      "The scanner version you are trying to download does not exist. Please check the version and try again.",
    );
  });

  it("should not download a scanner for Grade/Maven (OTHER)", async () => {
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => JdkVersionSource.JavaHome);
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "mock-organization");
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "6.0.0.1"); // MSBuild Default
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => "5.0.0.1"); // CLI Version
    jest.spyOn(tl, "getInput").mockImplementationOnce(() => ScannerMode.Other); // Other Mode

    const scanner = new Scanner(__dirname, ScannerMode.Other);

    jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scanner);

    await prept.prepareTask(EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).not.toHaveBeenCalled();
    expect(toolLib.extractZip).not.toHaveBeenCalled();
  });
});
