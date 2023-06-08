import * as path from "path";
import * as tl from "azure-pipelines-task-lib/task";
import { Guid } from "guid-typescript";
import { SemVer } from "semver";
import * as request from "../helpers/request";
import * as prept from "../prepare-task";
import Endpoint, { EndpointType } from "../sonarqube/Endpoint";
import Scanner, { ScannerMSBuild } from "../sonarqube/Scanner";

beforeEach(() => {
  jest.restoreAllMocks();
});

const SQ_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: "https://sonarqube.com" });

it("should display warning for dedicated extension for Sonarcloud", async () => {
  const scannerObject = new ScannerMSBuild(__dirname, {
    projectKey: "dummyProjectKey",
    projectName: "dummyProjectName",
    projectVersion: "dummyProjectVersion",
    organization: "dummyOrganization",
  });

  jest.spyOn(tl, "getVariable").mockImplementation(() => "");
  jest.spyOn(tl, "warning").mockImplementation(() => null);
  jest.spyOn(Scanner, "getPrepareScanner").mockImplementation(() => scannerObject);
  jest.spyOn(scannerObject, "runPrepare").mockImplementation(() => null);
  jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer("7.2.0"));

  jest.spyOn(prept, "getDefaultBranch").mockResolvedValue("refs/heads/master");

  await prept.default(SQ_ENDPOINT, __dirname);

  expect(tl.warning).toHaveBeenCalledWith(
    "There is a dedicated extension for SonarCloud: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud"
  );
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
      expectedBranchSupported: Boolean
    ) => {
      tl.debug(`${product} ${version}`);
      jest.spyOn(request, "getServerVersion").mockResolvedValue(new SemVer(version));
      const actual = await prept.branchFeatureSupported(endpoint, version);
      expect(actual).toBe(expectedBranchSupported);
    }
  );
});

it("should build report task path from variables", () => {
  const reportDirectory = path.join("C:", "temp", "dir");
  const sonarSubDirectory = "sonar";
  const buildNumber = "20250909.1";

  const guid = Guid.create();

  jest.spyOn(Guid, "create").mockImplementation(() => guid);

  const reportFullPath = path.join(
    reportDirectory,
    sonarSubDirectory,
    buildNumber,
    guid.toString(),
    "report-task.txt"
  );

  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => reportDirectory);
  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => buildNumber);

  const actual = prept.reportPath();

  expect(actual).toEqual(reportFullPath);
});
