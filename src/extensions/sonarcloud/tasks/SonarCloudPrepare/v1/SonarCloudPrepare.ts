import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarcloud-v1";

runTask(prepareTask, "Prepare", EndpointType.SonarCloud);
