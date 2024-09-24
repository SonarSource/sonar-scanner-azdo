import { fetchWithRetry } from "../helpers/api";
import { log, LogLevel } from "../helpers/logging";
import { waitFor } from "../helpers/utils";
import Endpoint, { EndpointType } from "./Endpoint";

export interface Task {
  id: string;
  analysisId: string;
  componentKey: string;
  organization?: string;
  status: string;
  errorMessage?: string;
  type: string;
  componentName: string;
  warnings: string[];
}

export async function waitForTaskCompletion(
  endpoint: Endpoint,
  taskId: string,
  tries: number,
  delay: number,
): Promise<Task> {
  log(LogLevel.DEBUG, `Waiting for task '${taskId}' to complete.`);
  let query = {};
  if (endpoint.type === EndpointType.SonarQube) {
    query = { id: taskId };
  } else {
    query = { id: taskId, additionalFields: "warnings" };
  }

  let attempts = 0;
  while (attempts < tries) {
    // Fetch task status
    let task: Task;

    try {
      ({ task } = (await fetchWithRetry(endpoint, `/api/ce/task`, query)) as { task: Task });
    } catch (error: unknown) {
      if (error instanceof Error) {
        log(LogLevel.ERROR, JSON.stringify(error.message));
      }
      throw new Error(`Could not fetch task for ID '${taskId}'`);
    }

    const status = task.status.toUpperCase();

    log(LogLevel.DEBUG, `Task status:` + status);
    if (status === "CANCELED" || status === "FAILED") {
      const errorInfo = task.errorMessage ? `, Error message: ${task.errorMessage}` : "";
      throw new Error(`Task failed with status ${task.status}${errorInfo}`);
    }
    if (status === "SUCCESS") {
      log(LogLevel.INFO, `Task ${task.id} completed`);
      return task;
    }
    // Task did not complete yet, we wait and retry
    await waitFor(delay);
    attempts++;
  }

  // If we are here, it means we timed out
  log(LogLevel.WARN, `Reached timeout while waiting for task to complete`);
  throw new TimeOutReachedError();
}

export class TimeOutReachedError extends Error {
  constructor() {
    super();
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TimeOutReachedError.prototype);
  }
}
