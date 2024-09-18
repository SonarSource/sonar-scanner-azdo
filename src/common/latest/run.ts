import * as tl from "azure-pipelines-task-lib/task";
import { log, LogLevel, setEndpointType } from "./helpers/logging";
import { EndpointType } from "./sonarqube/Endpoint";

export type TaskJob = (endpointType: EndpointType) => Promise<void>;

export async function runTask(fun: TaskJob, taskName: string, endpointType: EndpointType) {
  setEndpointType(endpointType);

  try {
    await fun(endpointType);
  } catch (err) {
    log(LogLevel.ERROR, `Error while executing task ${taskName}: ${err.message}`);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}
