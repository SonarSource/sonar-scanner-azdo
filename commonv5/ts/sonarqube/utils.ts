import * as tl from "azure-pipelines-task-lib/task";
import { RequestData, get } from "../helpers/request";
import Endpoint from "./Endpoint";
import { ProjectStatus } from "./types";
import { waitFor } from "../helpers/utils";

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
  tl.debug(`[SQ] Retrieve Analysis id '${analysisId}.'`);

  try {
    const { projectStatus } = (await get(endpoint, "/api/qualitygates/project_status", true, {
      analysisId,
    })) as { projectStatus: ProjectStatus };
    return projectStatus;
  } catch (error) {
    if (error?.message) {
      tl.error(`[SQ] Error retrieving analysis: ${error.message}`);
    } else if (error) {
      tl.error(`[SQ] Error retrieving analysis: ${JSON.stringify(error)}`);
    }
    throw new Error(`[SQ] Could not fetch analysis for ID '${analysisId}'`);
  }
}
