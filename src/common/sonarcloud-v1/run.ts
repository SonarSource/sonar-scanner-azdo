import * as tl from "azure-pipelines-task-lib";
import { EndpointType } from "./sonarqube/Endpoint";

export type TaskJob = (endpoint: EndpointType) => Promise<void>;

export async function runTask(fun: TaskJob, taskName: string, endpoint: EndpointType) {
  try {
    await fun(endpoint);
  } catch (err) {
    tl.warning(`Error while executing ${endpoint}:${taskName} task: ${err.message}`);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}
