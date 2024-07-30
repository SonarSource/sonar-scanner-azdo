import { EndpointType, publishTask, runTask } from "../../../../../common/sonarqube-v6";

runTask(publishTask, "Publish", EndpointType.SonarQube);
