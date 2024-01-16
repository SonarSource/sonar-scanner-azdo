import * as tl from "azure-pipelines-task-lib/task";
import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import { Metric, MetricsResponse } from "../../sonarqube/types";
import { RETRY_DELAY, fetchMetrics, fetchProjectStatus, fetchWithRetry } from "../api";
import { get } from "../request";

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

const MOCKED_METRICS: Metric[] = [
  {
    key: "bugs",
    type: "INT",
    name: "Bugs",
    description: "Bugs",
    domain: "Reliability",
    direction: -1,
    qualitative: false,
    hidden: false,
    custom: false,
  },
  {
    key: "code_smells",
    type: "INT",
    name: "Code Smells",
    description: "Code Smells",
    domain: "Maintainability",
    direction: -1,
    qualitative: false,
    hidden: false,
  },
];

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

  it("should fail if the project status fails to load", () => {
    jest.mocked(get).mockRejectedValueOnce(new Error("API Couldn't be reached"));

    expect(() => fetchProjectStatus(MOCKED_ENDPOINT, "analysisId")).rejects.toThrow(
      "Could not fetch analysis for ID 'analysisId'",
    );
  });

  it("should fail if the project status fails to load with non-standard error", () => {
    jest.mocked(get).mockRejectedValueOnce("API Couldn't be reached");

    expect(() => fetchProjectStatus(MOCKED_ENDPOINT, "analysisId")).rejects.toThrow(
      "Could not fetch analysis for ID 'analysisId'",
    );
  });
});

describe("fetchMetrics", () => {
  beforeEach(() => {
    (get as jest.Mock<any>).mockClear();
  });

  it("should correctly fetch metrics", async () => {
    jest.mocked(get).mockResolvedValueOnce({
      metrics: MOCKED_METRICS,
      p: 1,
      ps: MOCKED_METRICS.length,
      total: MOCKED_METRICS.length,
    } as MetricsResponse);

    const metrics = await fetchMetrics(MOCKED_ENDPOINT);
    expect(get).toHaveBeenCalledWith(MOCKED_ENDPOINT, "/api/metrics/search", true, {
      f: "name",
      ps: 500,
    });
    expect(metrics).toHaveLength(2);
    expect(metrics[0].key).toBe("bugs");
    expect(metrics[1].key).toBe("code_smells");
  });

  it("should correctly fetch multiple metric pages", async () => {
    jest.mocked(get).mockResolvedValueOnce({
      metrics: MOCKED_METRICS.slice(0, 1),
      p: 1,
      ps: 1,
      total: MOCKED_METRICS.length,
    });
    jest.mocked(get).mockResolvedValueOnce({
      metrics: MOCKED_METRICS.slice(1),
      p: 2,
      ps: 1,
      total: MOCKED_METRICS.length,
    });

    const metrics = await fetchMetrics(MOCKED_ENDPOINT);
    expect(metrics).toHaveLength(2);
    expect(metrics[0].key).toBe("bugs");
    expect(metrics[1].key).toBe("code_smells");
  });

  it("should fail if a metric page fails to load", () => {
    jest.mocked(get).mockResolvedValueOnce({
      metrics: MOCKED_METRICS.slice(0, 1),
      p: 1,
      ps: 1,
      total: MOCKED_METRICS.length,
    });
    jest.mocked(get).mockRejectedValueOnce(new Error("API Couldn't be reached"));
    jest.spyOn(tl, "error");

    expect(() => fetchMetrics(MOCKED_ENDPOINT)).rejects.toThrow("Could not fetch metrics");
  });

  it("should fail if the first metric page fails to load", () => {
    jest.mocked(get).mockRejectedValueOnce(new Error("API Couldn't be reached"));
    jest.spyOn(tl, "error");

    expect(() => fetchMetrics(MOCKED_ENDPOINT)).rejects.toThrow("Could not fetch metrics");
  });

  it("should fail if the first metric page fails to load with non-standard error", () => {
    jest.mocked(get).mockRejectedValueOnce("API Couldn't be reached");
    jest.spyOn(tl, "error");

    expect(() => fetchMetrics(MOCKED_ENDPOINT)).rejects.toThrow("Could not fetch metrics");
  });
});
