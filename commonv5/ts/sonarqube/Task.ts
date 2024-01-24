import * as tl from "azure-pipelines-task-lib/task";
import { waitFor } from "../helpers/utils";
import Endpoint, { EndpointType } from "./Endpoint";
import { fetchWithRetry } from "./utils";

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
    tl.debug(`[SQ] Waiting for task '${taskId}' to complete.`);
    let query = {};
    if (endpoint.type === EndpointType.SonarQube) {
      query = { id: taskId };
    } else {
      query = { id: taskId, additionalFields: "warnings" };
    }

    let attempts = 0;
    while (attempts < tries) {
      // Fetch task status
      let task: ITask;

      try {
        ({ task } = (await fetchWithRetry(endpoint, `/api/ce/task`, true, query)) as {
          task: ITask;
        });
      } catch (error) {
        tl.error(JSON.stringify(error?.message ?? error ?? "Unknown error"));
        throw new Error(`[SQ] Could not fetch task for ID '${taskId}'`);
      }

      const status = task.status.toUpperCase();

      tl.debug(`[SQ] Task status:` + status);
      if (status === "CANCELED" || status === "FAILED") {
        const errorInfo = task.errorMessage ? `, Error message: ${task.errorMessage}` : "";
        throw new Error(`[SQ] Task failed with status ${task.status}${errorInfo}`);
      }
      if (status === "SUCCESS") {
        tl.debug(`[SQ] Task complete: ${JSON.stringify(task)}`);
        return new Task(task);
      }
      // Task did not complete yet, we wait and retry
      await waitFor(delay);
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
