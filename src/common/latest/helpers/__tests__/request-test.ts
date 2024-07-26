import * as tl from "azure-pipelines-task-lib/task";
import fetch from "node-fetch";
import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import { get } from "../request";

jest.mock("node-fetch", () =>
  jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({ dummy: "data" }),
    text: jest.fn().mockResolvedValue("foobar"),
  }),
);

const MOCKED_ENDPOINT = new Endpoint(EndpointType.SonarQube, { url: "https://endpoint.url" });

describe("request", () => {
  const originalRequestTimeout = Endpoint.REQUEST_TIMEOUT;
  beforeEach(() => {
    Object.defineProperty(Endpoint, "REQUEST_TIMEOUT", { get: () => 1000 });
  });
  afterEach(() => {
    Object.defineProperty(Endpoint, "REQUEST_TIMEOUT", { get: () => originalRequestTimeout });
    jest.clearAllMocks();
  });

  it("get without error (text)", async () => {
    const response = await get(MOCKED_ENDPOINT, "/api/server/version", false, { a: "b" });
    expect(response).toEqual("foobar");

    const args = (fetch as any).mock.calls[0];
    expect(args[0]).toBe("https://endpoint.url/api/server/version?a=b");
    expect(args[1]).toMatchObject({
      headers: {
        Authorization: "Basic dW5kZWZpbmVkOg==",
      },
      method: "get",
    });
  });

  it("get without error (json)", async () => {
    const response = await get(MOCKED_ENDPOINT, "/api/some-api", true, { a: "b" });
    expect(response).toEqual({ dummy: "data" });

    const args = (fetch as any).mock.calls[0];
    expect(args[0]).toBe("https://endpoint.url/api/some-api?a=b");
    expect(args[1]).toMatchObject({
      headers: {
        Authorization: "Basic dW5kZWZpbmVkOg==",
      },
      method: "get",
    });
  });

  it("get with error", async () => {
    jest.spyOn(tl, "debug");
    (fetch as any).mockRejectedValueOnce(new Error("some error"));

    await expect(() => get(MOCKED_ENDPOINT, "/api/some-api", true, { a: "b" })).rejects.toThrow(
      "some error",
    );

    expect(tl.debug).toHaveBeenCalledWith(
      `[SQ] API GET '/api/some-api' failed, error is some error`,
    );
  });

  it("get with timeout", async () => {
    jest.spyOn(tl, "debug");
    jest.mocked(fetch).mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("Request timeout")));
      });
    });

    await expect(() => get(MOCKED_ENDPOINT, "/api/some-api", true, { a: "b" })).rejects.toThrow(
      "Request timeout",
    );

    expect(tl.debug).toHaveBeenCalledWith(
      `[SQ] API GET '/api/some-api' failed, error is Request timeout`,
    );
  });
});
