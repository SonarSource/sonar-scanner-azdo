import { EndpointType, analyzeTask, runTask } from "../../../../../common/latest";

runTask(analyzeTask, "Analyze", EndpointType.SonarQube);
