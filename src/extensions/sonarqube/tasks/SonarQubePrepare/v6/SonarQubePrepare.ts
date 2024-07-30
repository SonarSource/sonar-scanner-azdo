import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarqube-v6";

runTask(prepareTask, "Prepare", EndpointType.SonarQube);
