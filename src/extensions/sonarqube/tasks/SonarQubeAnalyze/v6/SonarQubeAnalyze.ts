import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarqube-v5";

runTask(analyzeTask, "Analyze", EndpointType.SonarQube);
