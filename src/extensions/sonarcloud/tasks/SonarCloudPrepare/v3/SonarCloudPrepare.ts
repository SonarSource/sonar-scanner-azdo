import { EndpointType, prepareTask, runTask } from "../../../../../common/latest";

runTask(prepareTask, "Prepare", EndpointType.SonarCloud);
