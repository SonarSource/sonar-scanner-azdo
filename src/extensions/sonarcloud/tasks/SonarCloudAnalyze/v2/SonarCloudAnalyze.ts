import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarcloud-v2";

runTask(analyzeTask, "Analyze", EndpointType.SonarCloud);
