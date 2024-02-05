import { EndpointType, prepareTask, runTask } from "../../../../src";

runTask(prepareTask, "Prepare", EndpointType.SonarCloud);
