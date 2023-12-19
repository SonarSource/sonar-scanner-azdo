import { get } from "../../helpers/request";
import Endpoint, { EndpointType } from "../Endpoint";
import { fetchProjectStatus } from "../utils";

const MOCKED_CONDITIONS = [
  {
    status: "ERROR",
    metricKey: "bugs",
    comparator: "GT",
    errorThreshold: "0",
    actualValue: "1",
  },
];
const MOCKED_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: "https://endpoint.url" });

jest.mock("azure-pipelines-task-lib/task", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  getHttpProxyConfiguration: jest.fn().mockImplementation(() => null),
}));

jest.mock("../../helpers/request", () => ({
  get: jest.fn(() =>
    Promise.resolve({
      projectStatus: {
        status: "ERROR",
        conditions: MOCKED_CONDITIONS,
      },
    }),
  ),
}));

beforeEach(() => {
  (get as jest.Mock<any>).mockClear();
});

it("should correctly fetch prohject status", async () => {
  const projectStatus = await fetchProjectStatus(MOCKED_ENDPOINT, "analysisId");

  expect(get).toHaveBeenCalledWith(MOCKED_ENDPOINT, "/api/qualitygates/project_status", true, {
    analysisId: "analysisId",
  });
  expect(projectStatus.status).toBe("ERROR");
  expect(projectStatus.conditions).toHaveLength(1);
  expect(projectStatus.conditions).toEqual(MOCKED_CONDITIONS);
});
