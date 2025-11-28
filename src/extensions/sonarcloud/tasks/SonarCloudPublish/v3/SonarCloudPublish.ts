import { EndpointType, publishTask, runTask } from "../../../../../common/sonarcloud-v3";

runTask(publishTask, "Publish", EndpointType.Cloud);
