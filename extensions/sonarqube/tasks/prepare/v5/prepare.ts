import * as tl from "azure-pipelines-task-lib/task";
import {
  startIgnoringCertificate,
  stopIgnoringCertificate,
} from "../../../../../common/ts/helpers/request";
import prepareTask from "../../../../../common/ts/prepare-task";
import Endpoint, { EndpointType } from "../../../../../common/ts/sonarqube/Endpoint";

async function run() {
  try {
    startIgnoringCertificate();
    const endpoint = Endpoint.getEndpoint(
      tl.getInput(EndpointType.SonarQube, true),
      EndpointType.SonarQube,
    );
    await prepareTask(endpoint, __dirname);
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  } finally {
    stopIgnoringCertificate();
  }
}

run();
