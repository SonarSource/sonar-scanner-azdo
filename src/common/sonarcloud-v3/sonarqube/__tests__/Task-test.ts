import * as tl from "azure-pipelines-task-lib/task";
import { fetchWithRetry } from "../../helpers/api";
import { log, LogLevel } from "../../helpers/logging";
import Endpoint, { EndpointType } from "../Endpoint";
import { TimeOutReachedError, waitForTaskCompletion } from "../Task";

const MOCKED_ENDPOINT = new Endpoint(EndpointType.Server, { url: "https://endpoint.url" });

jest.mock("../../helpers/logging");

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
  const task = await waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  expect(task).toEqual({ status: "SUCCESS" });
});

it("waits for failing task", async () => {
  for (let i = 0; i < 4; ++i) {
    jest.mocked(fetchWithRetry).mockResolvedValueOnce({ task: { status: "IN_PROGRESS" } });
  }
  jest.mocked(fetchWithRetry).mockResolvedValueOnce({ task: { status: "CANCELED" } });

  expect.assertions(2);
  try {
    await waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch("Task failed with status CANCELED");
  }
});

it("should fail if polling fails", async () => {
  jest.mocked(fetchWithRetry).mockRejectedValue(new Error("Polling failed"));

  expect.assertions(2);
  try {
    await waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch("Could not fetch task for ID 'taskId'");
  }
});

it("timeout if polling takes too long", async () => {
  jest.spyOn(tl, "debug");
  jest.mocked(fetchWithRetry).mockResolvedValue({ task: { status: "IN_PROGRESS" } });

  expect.assertions(3);
  try {
    await waitForTaskCompletion(MOCKED_ENDPOINT, "taskId", 5, 1);
  } catch (error) {
    expect(error).toBeInstanceOf(TimeOutReachedError);
    expect(log).toHaveBeenCalledWith(
      LogLevel.WARN,
      "Reached timeout while waiting for task to complete",
    );
    expect(fetchWithRetry).toHaveBeenCalledTimes(5);
  }
});
