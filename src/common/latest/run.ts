import * as tl from "azure-pipelines-task-lib/task";
import { log, LogLevel, setEndpointType } from "./helpers/logging";
import { EndpointType } from "./sonarqube/Endpoint";

export type TaskJob = (endpointType: EndpointType) => Promise<void>;

export async function runTask(fun: TaskJob, taskName: string, endpointType: EndpointType) {
  setEndpointType(endpointType);

  try {
    await fun(endpointType);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    log(LogLevel.ERROR, `Error while executing task ${taskName}: ${msg}`);
    tl.setResult(tl.TaskResult.Failed, msg);
  }
}
