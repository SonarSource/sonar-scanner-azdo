import { EndpointType, analyzeTask, runTask } from "../../../../../common/sonarqube-v6";

runTask(analyzeTask, "Analyze", EndpointType.SonarQube);
