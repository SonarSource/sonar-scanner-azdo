import { EndpointType } from "../sonarqube";
import { Task } from "../sonarqube/Task";

export function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-id",
    analysisId: "123",
    componentKey: "key",
    status: "OK",
    type: EndpointType.SonarCloud,
    componentName: "componentName",
    warnings: [],
    ...overrides,
  };
}
