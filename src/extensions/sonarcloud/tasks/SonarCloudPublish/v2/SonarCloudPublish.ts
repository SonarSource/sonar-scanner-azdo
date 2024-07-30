import { EndpointType, publishTask, runTask } from "../../../../../common/sonarcloud-v2";

runTask(publishTask, "Publish", EndpointType.SonarCloud);
