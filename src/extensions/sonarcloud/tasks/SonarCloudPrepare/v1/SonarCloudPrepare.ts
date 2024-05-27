import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarqube-v5";

runTask(prepareTask, "Prepare", EndpointType.SonarCloud);
