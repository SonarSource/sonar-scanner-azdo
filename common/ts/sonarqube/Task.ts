import * as tl from "azure-pipelines-task-lib/task";
import { get } from "../helpers/request";
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

  public get warnings() {
    if (this.task.warnings) {
      return this.task.warnings;
    } else {
      return [];
    }
  }

  public static waitForTaskCompletion(
    endpoint: Endpoint,
    taskId: string,
    tries: number,
    delay = 1000,
  ): Promise<Task> {
    // SEC-FIX: Do not log taskId — it is a sensitive internal identifier
    tl.debug(`[SQ] Waiting for task to complete.`);
    let query = {};
    if (endpoint.type === EndpointType.SonarQube) {
      query = { id: taskId };
    } else {
      query = { id: taskId, additionalFields: "warnings" };
    }
    // SEC-FIX: Exponential backoff — doubles delay each recursive call, capped at 30s
    const nextDelay = Math.min(delay * 2, 30000);
    return get(endpoint, `/api/ce/task`, true, query).then(
      ({ task }: { task: ITask }) => {
        tl.debug(`[SQ] Task status: ` + task.status);
        if (tries <= 0) {
          throw new TimeOutReachedError();
        }
        const errorInfo = task.errorMessage ? `, Error message: ${task.errorMessage}` : "";
        switch (task.status.toUpperCase()) {
          case "CANCELED":
          case "FAILED":
            throw new Error(`[SQ] Task failed with status ${task.status}${errorInfo}`);
          case "SUCCESS":
            // SEC-FIX: Do not log full task JSON — it contains componentKey, analysisId, organization
            tl.debug(`[SQ] Task complete.`);
            return new Task(task);
          default:
            return new Promise<Task>((resolve, reject) =>
              setTimeout(() => {
                Task.waitForTaskCompletion(endpoint, taskId, tries - 1, nextDelay).then(resolve, reject);
              }, delay),
            );
        }
      },
      (err) => {
        if (err && err.message) {
          tl.error(err.message);
        } else if (err) {
          tl.error(JSON.stringify(err));
        }
        // SEC-FIX: Do not include taskId in error message
        throw new Error(`[SQ] Could not fetch task status`);
      },
    );
  }
}

export class TimeOutReachedError extends Error {
  constructor() {
    super();
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TimeOutReachedError.prototype);
  }
}
