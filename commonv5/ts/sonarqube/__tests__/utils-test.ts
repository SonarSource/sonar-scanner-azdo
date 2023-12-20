import * as tl from "azure-pipelines-task-lib/task";
import { get } from "../../helpers/request";
import Endpoint, { EndpointType } from "../Endpoint";
import { Metric, MetricsResponse } from "../types";
import { fetchMetrics, fetchProjectStatus } from "../utils";

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

beforeEach(() => {
  (get as jest.Mock<any>).mockClear();
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

describe("fetchMetrics", () => {
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
});
