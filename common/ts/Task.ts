import * as tl from 'vsts-task-lib/task';
import Endpoint from './Endpoint';
import { getJSON } from './request';

interface ITask {
  analysisId: string;
  componentKey: string;
  organization?: string;
  status: string;
  type: string;
}

export default class Task {
  constructor(private task: ITask) {}

  public get analysisId() {
    return this.task.analysisId;
  }

  public static waitForTaskCompletion(
    endpoint: Endpoint,
    taskId: string,
    delay = 1000,
    tries = 300
  ): Promise<Task> {
    tl.debug(`[SQ] Waiting for task '${taskId}' to complete.`);
    return getJSON(endpoint, `/api/ce/task`, { id: taskId }).then(
      ({ task }: { task: ITask }) => {
        tl.debug(`[SQ] Task status:` + task.status);
        if (tries <= 0) {
          throw new Error(`[SQ] Timeout, task '${taskId}' took too long to complete.`);
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
                Task.waitForTaskCompletion(endpoint, taskId, delay, tries--).then(resolve, reject);
              }, delay)
            );
        }
      },
      err => {
        if (err && err.message) {
          tl.debug(err.message);
        }
        throw new Error(`[SQ] Could not fetch task for ID '${taskId}'`);
      }
    );
  }
}
