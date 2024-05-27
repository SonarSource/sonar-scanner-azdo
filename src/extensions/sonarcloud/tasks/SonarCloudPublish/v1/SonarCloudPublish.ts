import { EndpointType, publishTask, runTask } from "../../../../../common/sonarcloud-v1";

runTask(publishTask, "Publish", EndpointType.SonarCloud);
