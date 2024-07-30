import * as tl from "azure-pipelines-task-lib/task";
import { fetchWithRetry } from "../../helpers/api";
import Endpoint, { EndpointType } from "../Endpoint";
import Task, { TimeOutReachedError } from "../Task";

const MOCKED_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: "https://endpoint.url" });

jest.mock("../../helpers/request", () => ({
  ...jest.requireActual("../../helpers/request"),
  get: jest.fn(),
}));

jest.mock("../../helpers/api", () => ({
  ...jest.requireActual("../../helpers/api"),
  fetchWithRetry: jest.fn(),
}));

it("waits for task with success", async () => {
  for (let i = 0; i < 4; ++i) {
    jest.mocked(fetchWithRetry).mockResolvedValueOnce({ task: { status: "IN_PROGRESS" } });
  }
  jest.mocked(fetchWithRetry).mockResolvedValueOnce({ task: { status: "SUCCESS" } });
  const task = await Task.waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  expect(task).toEqual({ task: { status: "SUCCESS" } });
});

it("waits for failing task", async () => {
  for (let i = 0; i < 4; ++i) {
    jest.mocked(fetchWithRetry).mockResolvedValueOnce({ task: { status: "IN_PROGRESS" } });
  }
  jest.mocked(fetchWithRetry).mockResolvedValueOnce({ task: { status: "CANCELED" } });

  expect.assertions(1);
  try {
    await Task.waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  } catch (error) {
    expect(error.message).toMatch("Task failed with status CANCELED");
  }
});

it("should fail if polling fails", async () => {
  jest.mocked(fetchWithRetry).mockRejectedValue(new Error("Polling failed"));

  expect.assertions(1);
  try {
    await Task.waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  } catch (error) {
    expect(error.message).toMatch("[SQ] Could not fetch task for ID 'taskId'");
  }
});

it("timeout if polling takes too long", async () => {
  jest.spyOn(tl, "debug");
  jest.mocked(fetchWithRetry).mockResolvedValue({ task: { status: "IN_PROGRESS" } });

  expect.assertions(3);
  try {
    await Task.waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  } catch (error) {
    expect(error).toBeInstanceOf(TimeOutReachedError);
    expect(tl.debug).toHaveBeenCalledWith(
      "[SQ] Reached timeout while waiting for task to complete",
    );
    expect(fetchWithRetry).toHaveBeenCalledTimes(5);
  }
});
