import * as tl from "azure-pipelines-task-lib/task";
import Endpoint from "../sonarqube/Endpoint";
import {
  Measure,
  MeasureResponse,
  Metric,
  MetricsResponse,
  ProjectStatus,
} from "../sonarqube/types";
import { RequestData, get } from "./request";
import { waitFor } from "./utils";

export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_DELAY = 2000;

export async function fetchWithRetry<T>(
  endpoint: Endpoint,
  path: string,
  isJson: boolean,
  query?: RequestData,
): Promise<T | string> {
  let attempts = 0;
  while (attempts < RETRY_MAX_ATTEMPTS) {
    try {
      return await get<T>(endpoint, path, isJson, query);
    } catch (error) {
      attempts++;
      tl.debug(`[SQ] API GET '${path}' failed (attempt ${attempts}/${RETRY_MAX_ATTEMPTS})`);
      await waitFor(RETRY_DELAY);
    }
  }
  throw new Error(`[SQ] API GET '${path}' failed, max attempts reached`);
}

export async function fetchProjectStatus(
  endpoint: Endpoint,
  analysisId: string,
): Promise<ProjectStatus> {
  // SEC-FIX: Do not log analysisId — it is a sensitive internal identifier
  tl.debug(`Retrieving project status for analysis.`);

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

/**
 * @param prev Parameter used for recursive calls. Do not use.
 */
/**
 * SEC-FIX: Cap ps (page size) to 500 to prevent unbounded API requests.
 * SEC-FIX: Validate pagination parameters before use.
 */
const METRICS_MAX_PAGE_SIZE = 500;

export async function fetchMetrics(
  endpoint: Endpoint,
  data: { f?: string; p?: number; ps?: number } = { f: "name", ps: METRICS_MAX_PAGE_SIZE },
  prev?: MetricsResponse,
): Promise<Metric[]> {
  // Enforce safe page size cap
  const safeData = { ...data, ps: Math.min(data.ps ?? METRICS_MAX_PAGE_SIZE, METRICS_MAX_PAGE_SIZE) };
  try {
    const response = (await get(endpoint, "/api/metrics/search", true, safeData)) as MetricsResponse;
    const { metrics, p, ps, total } = response;
    if (typeof p !== "number" || typeof ps !== "number" || typeof total !== "number") {
      throw new Error("Invalid pagination response from /api/metrics/search");
    }
    const result = prev ? prev.metrics.concat(metrics) : metrics;
    if (p * ps >= total) {
      return result;
    }
    return fetchMetrics(endpoint, { ...safeData, p: p + 1 }, { ...response, metrics: result });
  } catch (error) {
    if (error?.message) {
      tl.error(error.message);
    } else if (error) {
      tl.error(JSON.stringify(error));
    }

    throw new Error(`Could not fetch metrics`);
  }
}

export async function fetchComponentMeasures(
  endpoint: Endpoint,
  data: { component: string; branch?: string; pullRequest?: string; metricKeys: string },
): Promise<Measure[]> {
  try {
    const response = (await get(
      endpoint,
      "/api/measures/component",
      true,
      data,
    )) as MeasureResponse;
    return response.component.measures;
  } catch (error) {
    if (error?.message) {
      tl.debug("Error fetching component measures: " + error.message);
    } else if (error) {
      tl.debug("Error fetching component measures: " + JSON.stringify(error));
    }

    throw new Error(`Could not fetch component measures`);
  }
}
