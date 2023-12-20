import * as tl from "azure-pipelines-task-lib/task";
import { get } from "./request";
import Endpoint from "../sonarqube/Endpoint";
import { Metric, MetricsResponse, ProjectStatus } from "../sonarqube/types";

export async function fetchProjectStatus(
  endpoint: Endpoint,
  analysisId: string,
): Promise<ProjectStatus> {
  tl.debug(`Retrieve Analysis id '${analysisId}.'`);

  try {
    const { projectStatus } = (await get(endpoint, "/api/qualitygates/project_status", true, {
      analysisId,
    })) as { projectStatus: ProjectStatus };
    return projectStatus;
  } catch (error) {
    if (error?.message) {
      tl.error(`Error retrieving analysis: ${error.message}`);
    } else if (error) {
      tl.error(`Error retrieving analysis: ${JSON.stringify(error)}`);
    }
    throw new Error(`Could not fetch analysis for ID '${analysisId}'`);
  }
}

export async function fetchMetrics(
  endpoint: Endpoint,
  data: { f?: string; p?: number; ps?: number } = { f: "name", ps: 500 },
  prev?: MetricsResponse,
): Promise<Metric[]> {
  try {
    const response = (await get(endpoint, "/api/metrics/search", true, data)) as MetricsResponse;
    const { metrics, p, ps, total } = response;
    const result = prev ? prev.metrics.concat(metrics) : metrics;
    if (p * ps >= total) {
      return result;
    }
    return fetchMetrics(endpoint, { ...data, p: p + 1 }, { ...response, metrics: result });
  } catch (error) {
    if (error?.message) {
      tl.error(error.message);
    } else if (error) {
      tl.error(JSON.stringify(error));
    }

    throw new Error(`Could not fetch metrics`);
  }
}
