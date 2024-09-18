import Endpoint from "../sonarqube/Endpoint";
import {
  Measure,
  MeasureResponse,
  Metric,
  MetricsResponse,
  ProjectStatus,
} from "../sonarqube/types";
import { log, LogLevel } from "./logging";
import { get, RequestData } from "./request";
import { waitFor } from "./utils";

export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_DELAY = 2000;

export async function fetchWithRetry<T>(
  endpoint: Endpoint,
  path: string,
  query?: RequestData,
): Promise<T | string> {
  let attempts = 0;
  while (attempts < RETRY_MAX_ATTEMPTS) {
    try {
      return await get<T>(endpoint, path, query);
    } catch (error) {
      attempts++;
      log(LogLevel.DEBUG, `API GET '${path}' failed (attempt ${attempts}/${RETRY_MAX_ATTEMPTS})`);
      await waitFor(RETRY_DELAY);
    }
  }
  throw new Error(`API GET '${path}' failed, max attempts reached`);
}

export async function fetchProjectStatus(
  endpoint: Endpoint,
  analysisId: string,
): Promise<ProjectStatus> {
  log(LogLevel.DEBUG, `Retrieve Analysis id '${analysisId}.'`);

  try {
    const { projectStatus } = await get<{ projectStatus: ProjectStatus }>(
      endpoint,
      "/api/qualitygates/project_status",
      {
        analysisId,
      },
    );
    return projectStatus;
  } catch (error) {
    if (error?.message) {
      log(LogLevel.ERROR, `Error retrieving analysis: ${error.message}`);
    } else if (error) {
      log(LogLevel.ERROR, `Error retrieving analysis: ${JSON.stringify(error)}`);
    }
    throw new Error(`Could not fetch analysis for ID '${analysisId}'`);
  }
}

/**
 * @param prev Parameter used for recursive calls. Do not use.
 */
export async function fetchMetrics(
  endpoint: Endpoint,
  data: { f?: string; p?: string; ps?: string } = { f: "name", ps: "500" },
  prev?: MetricsResponse,
): Promise<Metric[]> {
  try {
    const response = await get<MetricsResponse>(endpoint, "/api/metrics/search", data);
    const { metrics, p, ps, total } = response;
    const result = prev ? prev.metrics.concat(metrics) : metrics;
    if (p * ps >= total) {
      return result;
    }
    return fetchMetrics(
      endpoint,
      { ...data, p: (p + 1).toString() },
      { ...response, metrics: result },
    );
  } catch (error) {
    if (error?.message) {
      log(LogLevel.ERROR, error.message);
    } else if (error) {
      log(LogLevel.ERROR, JSON.stringify(error));
    }

    throw new Error(`Could not fetch metrics`);
  }
}

export async function fetchComponentMeasures(
  endpoint: Endpoint,
  data: { component: string; branch?: string; pullRequest?: string; metricKeys: string },
): Promise<Measure[]> {
  try {
    const response = await get<MeasureResponse>(endpoint, "/api/measures/component", data);
    return response.component.measures;
  } catch (error) {
    if (error) {
      log(
        LogLevel.INFO,
        "Error fetching component measures: " + (error.message ?? JSON.stringify(error)),
      );
    }

    throw new Error(`Could not fetch component measures`);
  }
}
