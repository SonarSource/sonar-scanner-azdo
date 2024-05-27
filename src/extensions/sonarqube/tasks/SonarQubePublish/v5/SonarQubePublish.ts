import { EndpointType, publishTask, runTask } from "../../../../../common/sonarqube-v5";

runTask(publishTask, "Publish", EndpointType.SonarQube);
