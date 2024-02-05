import { EndpointType, analyzeTask, runTask } from "../../../../src";

runTask(analyzeTask, "Analyze", EndpointType.SonarCloud);
