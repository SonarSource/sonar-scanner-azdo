import { EndpointType, publishTask, runTask } from "../../../../src";

runTask(publishTask, "Publish", EndpointType.SonarCloud);
