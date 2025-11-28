import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarcloud-v3";

runTask(analyzeTask, "Analyze", EndpointType.Cloud);
