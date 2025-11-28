import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarqube-v7";

runTask(analyzeTask, "Analyze", EndpointType.Server);
