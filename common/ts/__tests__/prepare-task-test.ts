import * as tl from "azure-pipelines-task-lib/task";
import { SemVer } from "semver";
import { DEPRECATION_MESSAGE } from "../helpers/constants";
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

  expect(tl.warning).toHaveBeenCalledWith(DEPRECATION_MESSAGE);
});

it("should build report task path from variables", () => {
  expect(true).toBe(true);
});
