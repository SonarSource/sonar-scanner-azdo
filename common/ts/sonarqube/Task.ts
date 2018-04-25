import * as tl from 'vsts-task-lib/task';
import Endpoint from './Endpoint';
import { getJSON } from '../helpers/request';

interface ITask {
  analysisId: string;
  componentKey: string;
  organization?: string;
  status: string;
  type: string;
  componentName: string;
}

export default class Task {
  constructor(private readonly task: ITask) {}

  public get analysisId() {
    return this.task.analysisId;
  }

  public get componentName() {
    return this.task.componentName;
  }

  public static waitForTaskCompletion(
    endpoint: Endpoint,
    taskId: string,
    tries: number,
    delay = 1000
  ): Promise<Task> {
    tl.debug(`[SQ] Waiting for task '${taskId}' to complete.`);
    return getJSON(endpoint, `/api/ce/task`, { id: taskId }).then(
      ({ task }: { task: ITask }) => {
        tl.debug(`[SQ] Task status:` + task.status);
        if (tries <= 0) {
          throw new TimeOutReachedError();
        }
        switch (task.status.toUpperCase()) {
          case 'CANCEL':
          case 'FAILED':
            throw new Error(`[SQ] Task failed with status ${task.status}`);
          case 'SUCCESS':
            tl.debug(`[SQ] Task complete: ${JSON.stringify(task)}`);
            return new Task(task);
          default:
            return new Promise<Task>((resolve, reject) =>
              setTimeout(() => {
                Task.waitForTaskCompletion(endpoint, taskId, tries, delay).then(resolve, reject);
                tries--;
              }, delay)
            );
        }
      },
      err => {
        if (err && err.message) {
          tl.error(err.message);
        } else if (err) {
          tl.error(JSON.stringify(err));
        }
        throw new Error(`[SQ] Could not fetch task for ID '${taskId}'`);
      }
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
