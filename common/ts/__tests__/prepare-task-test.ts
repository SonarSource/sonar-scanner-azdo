import * as path from "path";
import * as tl from "azure-pipelines-task-lib/task";
import { Guid } from "guid-typescript";
import { SemVer } from "semver";
import Endpoint, { EndpointType } from "../sonarqube/Endpoint";
import * as prept from "../prepare-task";
import * as request from "../helpers/request";
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
    organization: "dummyOrganization"
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
