import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarqube-v4";

runTask(prepareTask, "Prepare", EndpointType.SonarQube);
