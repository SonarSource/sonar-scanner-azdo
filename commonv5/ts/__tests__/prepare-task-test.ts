import * as tl from "azure-pipelines-task-lib/task";
import { Guid } from "guid-typescript";
import * as path from "path";
import { SemVer } from "semver";
import * as request from "../helpers/request";
import * as prept from "../prepare-task";
import Endpoint, { EndpointType } from "../sonarqube/Endpoint";
import TaskReport from "../sonarqube/TaskReport";

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
