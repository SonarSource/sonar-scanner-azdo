import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import { get } from "../../helpers/request";
import { RETRY_DELAY, fetchProjectStatus, fetchWithRetry } from "../utils";

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
  get: jest.fn(),
}));

describe("fetchWithRetry", () => {
  beforeEach(() => {
    (get as jest.Mock<any>).mockClear();
  });

  it(
    "should not fail after up to 2 attempts",
    async () => {
      for (let i = 0; i < 2; i++) {
        jest.mocked(get).mockRejectedValueOnce(new Error("foo"));
      }
      jest.mocked(get).mockResolvedValueOnce("bar");

      const result = await fetchWithRetry(MOCKED_ENDPOINT, "/api", false);
      expect(result).toBe("bar");
      expect(get).toHaveBeenCalledTimes(3);
    },
    RETRY_DELAY * 3,
  );

  it(
    "should fail after 3 failing requests",
    async () => {
      for (let i = 0; i < 3; i++) {
        jest.mocked(get).mockRejectedValueOnce(new Error("foo"));
      }

      expect.assertions(2);
      try {
        await fetchWithRetry(MOCKED_ENDPOINT, "/api", false);
      } catch (error) {
        expect(get).toHaveBeenCalledTimes(3);
        expect(error.message).toBe("[SQ] API GET '/api' failed, max attempts reached");
      }
    },
    RETRY_DELAY * 4,
  );
});

describe("fetchProjectStatus", () => {
  it("should correctly fetch project status", async () => {
    jest.mocked(get).mockResolvedValueOnce({
      projectStatus: {
        status: "ERROR",
        conditions: MOCKED_CONDITIONS,
      },
    });

    const projectStatus = await fetchProjectStatus(MOCKED_ENDPOINT, "analysisId");

    expect(get).toHaveBeenCalledWith(MOCKED_ENDPOINT, "/api/qualitygates/project_status", true, {
      analysisId: "analysisId",
    });
    expect(projectStatus.status).toBe("ERROR");
    expect(projectStatus.conditions).toHaveLength(1);
    expect(projectStatus.conditions).toEqual(MOCKED_CONDITIONS);
  });
});

describe("fetchWithRetry", () => {
  beforeEach(() => {
    (get as jest.Mock<any>).mockClear();
  });

  it(
    "should not fail after up to 2 attempts",
    async () => {
      for (let i = 0; i < 2; i++) {
        jest.mocked(get).mockRejectedValueOnce(new Error("foo"));
      }
      jest.mocked(get).mockResolvedValueOnce("bar");

      const result = await fetchWithRetry(MOCKED_ENDPOINT, "/api", false);
      expect(result).toBe("bar");
      expect(get).toHaveBeenCalledTimes(3);
    },
    RETRY_DELAY * 3,
  );

  it(
    "should fail after 3 failing requests",
    async () => {
      for (let i = 0; i < 3; i++) {
        jest.mocked(get).mockRejectedValueOnce(new Error("foo"));
      }

      expect.assertions(2);
      try {
        await fetchWithRetry(MOCKED_ENDPOINT, "/api", false);
      } catch (error) {
        expect(get).toHaveBeenCalledTimes(3);
        expect(error.message).toBe("[SQ] API GET '/api' failed, max attempts reached");
      }
    },
    RETRY_DELAY * 4,
  );
});
