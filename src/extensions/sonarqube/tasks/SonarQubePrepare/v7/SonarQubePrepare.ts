import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarqube-v7";

runTask(prepareTask, "Prepare", EndpointType.Server);
