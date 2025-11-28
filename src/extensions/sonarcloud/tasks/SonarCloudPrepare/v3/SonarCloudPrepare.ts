import { EndpointType, prepareTask, runTask } from "../../../../../common/sonarcloud-v3";

runTask(prepareTask, "Prepare", EndpointType.Cloud);
