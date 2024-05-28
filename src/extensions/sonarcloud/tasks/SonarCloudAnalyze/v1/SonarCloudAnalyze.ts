import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarcloud-v1";

runTask(analyzeTask, "Analyze", EndpointType.SonarCloud);
