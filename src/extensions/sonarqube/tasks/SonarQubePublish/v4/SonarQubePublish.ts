import { EndpointType, publishTask, runTask } from "../../../../../common/sonarqube-v4";

runTask(publishTask, "Publish", EndpointType.SonarQube);
