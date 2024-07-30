import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarcloud-v2";

runTask(prepareTask, "Prepare", EndpointType.SonarCloud);
