import * as tl from "azure-pipelines-task-lib/task";
import { Guid } from "guid-typescript";
import * as path from "path";
import * as prept from "../prepare-task";

beforeEach(() => {
  jest.restoreAllMocks();
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
    "report-task.txt",
  );

  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => reportDirectory);
  jest.spyOn(tl, "getVariable").mockImplementationOnce(() => buildNumber);

  const actual = prept.reportPath();

  expect(actual).toEqual(reportFullPath);
});
