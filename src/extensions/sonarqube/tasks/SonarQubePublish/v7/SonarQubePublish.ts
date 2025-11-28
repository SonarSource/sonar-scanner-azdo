import { EndpointType, publishTask, runTask } from "../../../../../common/sonarqube-v7";

runTask(publishTask, "Publish", EndpointType.Server);
