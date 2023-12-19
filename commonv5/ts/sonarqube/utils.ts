import * as tl from "azure-pipelines-task-lib/task";
import { get } from "../helpers/request";
import Endpoint from "./Endpoint";
import { ProjectStatus } from "./types";

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
