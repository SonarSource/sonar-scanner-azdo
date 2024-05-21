import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarqube-v4";

runTask(analyzeTask, "Analyze", EndpointType.SonarQube);
