import { WebApi } from "azure-devops-node-api";
import { GitApi } from "azure-devops-node-api/GitApi";
import * as tl from "azure-pipelines-task-lib/task";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { Guid } from "guid-typescript";
import * as path from "path";
import { SemVer } from "semver";
import { AzureProvider, JdkVersionSource } from "../helpers/constants";
import * as request from "../helpers/request";
import { AzureTaskLibMock } from "../mocks/AzureTaskLibMock";
import { AzureToolLibMock } from "../mocks/AzureToolLibMock";
import * as prept from "../prepare-task";
import { runTask } from "../run";
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

describe("branch and pull request", () => {
  describe("detect branch feature", () => {
    it.each([
      [new Endpoint(EndpointType.SonarCloud, { url: "https://sonarcloud.io" }), "1.2.3", true],
      [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "7.1.0", false],
      [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "9.9.0", true],
      [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "10.0.0", true],
      [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "10.1.0", true],
      [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "11.0.0", true],
      [new Endpoint(EndpointType.SonarQube, { url: "https://localhost" }), "12.0.0", true],
    ])(
      "branch feature is supported for %p %p %p",
      (endpoint: Endpoint, version: string, expectedBranchSupported: Boolean) => {
        jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer(version));
        const actual = prept.branchFeatureSupported(endpoint, version);
        expect(actual).toBe(expectedBranchSupported);
      },
    );
  });

  describe("should populate branch and pull request properties", () => {
    it("should not do anything for non-pull request", () => {
      const props = {};
      prept.populateBranchAndPrProps(props);
      expect(props).toEqual({});
    });

    it("should set basic pull request properties if no supported provider", () => {
      azureTaskLibMock.setVariables({
        "System.TeamFoundationCollectionUri": "refs/heads/main",
        "Build.Repository.Provider": "unsupported-provider",
        "System.PullRequest.PullRequestId": "123",
        "System.PullRequest.TargetBranch": "refs/heads/main",
        "System.PullRequest.SourceBranch": "refs/heads/dev/br/feature",
      });
      const props = {};
      prept.populateBranchAndPrProps(props);
      expect(props).toEqual({
        "sonar.pullrequest.key": "123",
        "sonar.pullrequest.base": "main",
        "sonar.pullrequest.branch": "dev/br/feature",
        "sonar.scanner.skip": "true",
      });
    });
  });

  describe("default branch detection", () => {
    it('should detect TfsGit default branch "refs/heads/main"', async () => {
      azureTaskLibMock.setVariables({
        "System.TeamFoundationCollectionUri": "uri",
        "Build.Repository.Provider": AzureProvider.TfsGit,
        "Build.SourceBranch": "refs/heads/main",
      });
      jest.spyOn(WebApi.prototype, "getGitApi").mockResolvedValue({
        getRepository: jest.fn().mockReturnValue({
          defaultBranch: "refs/heads/main",
        }),
      } as unknown as GitApi);
      const props = {};
      await prept.populateBranchAndPrProps(props);
      expect(props).toEqual({});
    });

    it('should detect TfsGit non-default branch "refs/heads/dev"', async () => {
      azureTaskLibMock.setVariables({
        "System.TeamFoundationCollectionUri": "uri",
        "Build.Repository.Provider": AzureProvider.TfsGit,
        "Build.SourceBranch": "refs/heads/dev",
      });
      jest.spyOn(WebApi.prototype, "getGitApi").mockResolvedValue({
        getRepository: jest.fn().mockReturnValue({
          defaultBranch: "refs/heads/master",
        }),
      } as unknown as GitApi);
      const props = {};
      await prept.populateBranchAndPrProps(props);
      expect(props).toEqual({
        "sonar.branch.name": "dev",
      });
    });

    it.each([
      [AzureProvider.Git, "refs/heads/master", true],
      [AzureProvider.Git, "refs/heads/main", false],
      [AzureProvider.GitHub, "refs/heads/master", true],
      [AzureProvider.GitHub, "refs/heads/main", false],
      [AzureProvider.GitHubEnterprise, "refs/heads/master", true],
      [AzureProvider.GitHubEnterprise, "refs/heads/main", false],
      [AzureProvider.Bitbucket, "refs/heads/master", true],
      [AzureProvider.Bitbucket, "refs/heads/main", false],
    ])("should detect default branch (%s, %s, %s)", async (provider, branchName, isDefault) => {
      azureTaskLibMock.setVariables({
        "System.TeamFoundationCollectionUri": "refs/heads/main",
        "Build.Repository.Provider": provider,
        "Build.SourceBranch": branchName,
      });
      const props = {};
      await prept.populateBranchAndPrProps(props);
      expect(props).toEqual(
        isDefault
          ? {}
          : {
              "sonar.branch.name": prept.getBranchNameFromRef(branchName),
            },
      );
    });
  });
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
    async (scannerMode, dotnetScannerVersion, cliScannerVersion, url) => {
      azureTaskLibMock.setInputs({
        SonarQube: "SQ",
        jdkversion: JdkVersionSource.JavaHome,
        organization: "mock-organization",
        dotnetScannerVersion,
        cliScannerVersion,
        scannerMode,
      });

      const mockedScanner =
        scannerMode === ScannerMode.CLI
          ? new ScannerCLI(__dirname, { projectSettings: "scanner.properties" })
          : new ScannerMSBuild(__dirname, {});
      jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => mockedScanner);

      await runTask(prept.prepareTask, "Prepare", EndpointType.SonarQube);

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
      dotnetScannerVersion: "6.0.0.1",
      cliScannerVersion: "5.0.0.1",
      scannerMode: ScannerMode.CLI,
    });

    jest.spyOn(toolLib, "downloadTool").mockRejectedValue(new Error(errorResponse));
    jest.spyOn(tl, "setResult").mockImplementation(() => null);

    await runTask(prept.prepareTask, "Prepare", EndpointType.SonarQube);

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

    await runTask(prept.prepareTask, "Prepare", EndpointType.SonarQube);

    expect(Scanner.getPrepareScanner).toHaveBeenCalled();
    expect(toolLib.downloadTool).not.toHaveBeenCalled();
    expect(toolLib.extractZip).not.toHaveBeenCalled();
  });
});
