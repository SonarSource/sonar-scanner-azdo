import * as tl from "azure-pipelines-task-lib/task";
import { fetchWithRetry } from "../helpers/api";
import { waitFor } from "../helpers/utils";
import Endpoint, { EndpointType } from "./Endpoint";

interface ITask {
  analysisId: string;
  componentKey: string;
  organization?: string;
  status: string;
  errorMessage?: string;
  type: string;
  componentName: string;
  warnings: string[];
}

export default class Task {
  constructor(private readonly task: ITask) {}

  public get analysisId() {
    return this.task.analysisId;
  }

  public get componentName() {
    return this.task.componentName;
  }

  public get componentKey() {
    return this.task.componentKey;
  }

  public get warnings() {
    if (this.task.warnings) {
      return this.task.warnings;
    } else {
      return [];
    }
  }

  public static async waitForTaskCompletion(
    endpoint: Endpoint,
    taskId: string,
    tries: number,
    delay: number,
  ): Promise<Task> {
    // SEC-FIX: Do not log taskId — it is a sensitive internal identifier
    tl.debug(`[SQ] Waiting for task to complete.`);
    let query = {};
    if (endpoint.type === EndpointType.SonarQube) {
      query = { id: taskId };
    } else {
      query = { id: taskId, additionalFields: "warnings" };
    }

    let attempts = 0;
    // SEC-FIX: Exponential backoff — doubles delay each attempt, capped at 30s
    let currentDelay = delay;
    const MAX_DELAY = 30000;

    while (attempts < tries) {
      // Fetch task status
      let task: ITask;

      try {
        ({ task } = (await fetchWithRetry(endpoint, `/api/ce/task`, true, query)) as {
          task: ITask;
        });
      } catch (error) {
        tl.error(JSON.stringify(error?.message ?? error ?? "Unknown error"));
        // SEC-FIX: Do not include taskId in error message
        throw new Error(`[SQ] Could not fetch task status`);
      }

      const status = task.status.toUpperCase();

      tl.debug(`[SQ] Task status: ` + status);
      if (status === "CANCELED" || status === "FAILED") {
        const errorInfo = task.errorMessage ? `, Error message: ${task.errorMessage}` : "";
        throw new Error(`[SQ] Task failed with status ${task.status}${errorInfo}`);
      }
      if (status === "SUCCESS") {
        // SEC-FIX: Do not log full task JSON — it contains componentKey, analysisId, organization
        tl.debug(`[SQ] Task complete.`);
        return new Task(task);
      }
      // Task did not complete yet — wait with exponential backoff
      await waitFor(currentDelay);
      currentDelay = Math.min(currentDelay * 2, MAX_DELAY);
      attempts++;
    }

    // If we are here, it means we timed out
    tl.debug(`[SQ] Reached timeout while waiting for task to complete`);
    throw new TimeOutReachedError();
  }
}

export class TimeOutReachedError extends Error {
  constructor() {
    super();
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TimeOutReachedError.prototype);
  }
}
