import * as tl from "azure-pipelines-task-lib/task";
import {
  startIgnoringCertificate,
  stopIgnoringCertificate,
} from "../../../../../common/ts/helpers/request";
import publishTask from "../../../../../common/ts/publish-task";
import { EndpointType } from "../../../../../common/ts/sonarqube/Endpoint";

async function run() {
  try {
    startIgnoringCertificate();
    await publishTask(EndpointType.SonarQube);
  } catch (err) {
    tl.debug("[SQ] Publish task error: " + err.message);
    tl.setResult(tl.TaskResult.Failed, err.message);
  } finally {
    stopIgnoringCertificate();
  }
}

run();
