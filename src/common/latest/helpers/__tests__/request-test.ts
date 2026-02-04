import axios from "axios";
import AxiosMock from "axios-mock-adapter";
import * as tl from "azure-pipelines-task-lib/task";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";
import { AzureTaskLibMock } from "../../mocks/AzureTaskLibMock";
import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import { get, getServerVersion } from "../request";

const axiosMock = new AxiosMock(axios);
const azureTaskLibMock = new AzureTaskLibMock();

const ENDPOINT = new Endpoint(EndpointType.Server, {
  url: "https://endpoint.url",
  token: "the-token",
});

beforeEach(() => {
  jest.restoreAllMocks();
  axiosMock.reset();
  azureTaskLibMock.reset();
});

jest.mock("azure-pipelines-task-lib/task");

describe("request", () => {
  describe("get", () => {
    it("should get a JSON response with token auth", async () => {
      axiosMock
        .onGet(`${ENDPOINT.url}/api/server/version`, {
          params: {
            a: "b",
          },
        })
        .reply(200, { dummy: "data" });

      const response = await get(ENDPOINT, "/api/server/version", { a: "b" });
      expect(response).toEqual({
        dummy: "data",
      });

      const args = axiosMock.history.get[0];
      expect(args).toMatchObject({
        headers: {
          Authorization: `Bearer the-token`,
        },
        timeout: Endpoint.REQUEST_TIMEOUT,
      });
    });

    it("should get a JSON response with password auth", async () => {
      const endpoint = new Endpoint(EndpointType.Server, {
        url: "https://endpoint.url",
        username: "the-username",
        password: "the-password",
      });
      axiosMock
        .onGet(`${endpoint.url}/api/server/version`, {
          params: {
            a: "b",
          },
        })
        .reply(200, { dummy: "data" });

      const response = await get(endpoint, "/api/server/version", { a: "b" });
      expect(response).toEqual({
        dummy: "data",
      });

      const args = axiosMock.history.get[0];
      expect(args).toMatchObject({
        auth: {
          username: "the-username",
          password: "the-password",
        },
        timeout: Endpoint.REQUEST_TIMEOUT,
      });
    });

    it("get with network error", async () => {
      axiosMock.onGet(`${ENDPOINT.url}/api/server/version`, { params: { a: "b" } }).networkError();

      await expect(() => get(ENDPOINT, "/api/server/version", { a: "b" })).rejects.toThrow(
        "API GET '/api/server/version' failed. Axios Error message: Network Error.",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `[DEBUG] SonarQube Server: API GET '/api/server/version' failed. Axios Error message: Network Error.`,
      );
    });

    it("get with error", async () => {
      axiosMock
        .onGet(`${ENDPOINT.url}/api/server/version`, { params: { a: "b" } })
        .reply(500, "some error");

      await expect(() => get(ENDPOINT, "/api/server/version", { a: "b" })).rejects.toThrow(
        "API GET '/api/server/version' failed. Axios Error message: Request failed with status code 500.",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `[DEBUG] SonarQube Server: API GET '/api/server/version' failed. Axios Error message: Request failed with status code 500.`,
      );
    });

    it("get with timeout", async () => {
      axiosMock.onGet(`${ENDPOINT.url}/api/server/version`, { params: { a: "b" } }).timeout();

      await expect(() => get(ENDPOINT, "/api/server/version", { a: "b" })).rejects.toThrow(
        "API GET '/api/server/version' failed. Axios Error message: timeout of 60000ms exceeded.",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `[DEBUG] SonarQube Server: API GET '/api/server/version' failed. Axios Error message: timeout of 60000ms exceeded.`,
      );
    });

    it("get with non-Axios error", async () => {
      const genericError = new Error("Some non-Axios error occurred");

      axiosMock.onGet(`${ENDPOINT.url}/api/server/version`, { params: { a: "b" } }).reply(() => {
        throw genericError;
      });

      await expect(() => get(ENDPOINT, "/api/server/version", { a: "b" })).rejects.toThrow(
        "API GET '/api/server/version' failed. Error message: Some non-Axios error occurred.",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `[DEBUG] SonarQube Server: API GET '/api/server/version' failed. Error message: Some non-Axios error occurred.`,
      );
    });
  });

  describe("proxy", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it("should use proxy for https endpoint", async () => {
      process.env.HTTP_PROXY = "http://proxy.url";
      const endpoint = new Endpoint(EndpointType.Server, { url: "https://endpoint.url" });

      axiosMock.onGet(`${endpoint.url}/api/server/version`).reply(200, "1.2.3.4");

      const response = await get(endpoint, "/api/server/version");
      expect(response).toEqual("1.2.3.4");

      const args = axiosMock.history.get[0];
      const { httpAgent, httpsAgent } = args;
      expect(httpAgent).toBeUndefined();
      expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
      expect(httpsAgent.proxy.origin).toBe(process.env.HTTP_PROXY);
    });

    it("should use proxy for http endpoint", async () => {
      process.env.HTTP_PROXY = "http://proxy.url";
      const endpoint = new Endpoint(EndpointType.Server, { url: "http://endpoint.url" });

      axiosMock.onGet(`${endpoint.url}/api/server/version`).reply(200, "1.2.3.4");

      const response = await get(endpoint, "/api/server/version");
      expect(response).toEqual("1.2.3.4");

      const args = axiosMock.history.get[0];
      const { httpAgent, httpsAgent } = args;
      expect(httpAgent).toBeInstanceOf(HttpProxyAgent);
      expect(httpsAgent).toBeUndefined();
    });
  });

  describe("getServerVersion", () => {
    it("getServerVersion without error", async () => {
      jest.spyOn(console, "log");
      axiosMock.onGet(`${ENDPOINT.url}/api/server/version`).reply(200, "7.9.1.48248");

      const semver = await getServerVersion(ENDPOINT);
      expect(semver.toString()).toEqual("7.9.1");

      expect(console.log).toHaveBeenCalledWith(
        `[INFO]  SonarQube Server: Server version: 7.9.1.48248`,
      );
    });
  });

  describe("detailed logging", () => {
    describe("logAxiosResponseDetails", () => {
      it("should log response details when debug is enabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "true" });
        axiosMock
          .onGet(`${ENDPOINT.url}/api/test`, { params: { query: "param" } })
          .reply(200, { result: "success" });

        await get(ENDPOINT, "/api/test", { query: "param" });

        expect(tl.debug).toHaveBeenCalledWith(
          expect.stringContaining("API GET '/api/test' succeeded with status 200"),
        );
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response request:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response headers:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response data:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response config:"));
      });

      it("should not log response details when debug is disabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "false" });
        axiosMock
          .onGet(`${ENDPOINT.url}/api/test`, { params: { query: "param" } })
          .reply(200, { result: "success" });

        await get(ENDPOINT, "/api/test", { query: "param" });

        expect(tl.debug).not.toHaveBeenCalledWith(
          expect.stringContaining("API GET '/api/test' succeeded with status 200"),
        );
        expect(tl.debug).not.toHaveBeenCalledWith(expect.stringContaining("Response request:"));
      });

      it("should safely stringify circular references in response", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "true" });
        axiosMock.onGet(`${ENDPOINT.url}/api/test`).reply(200, { result: "success" });

        await get(ENDPOINT, "/api/test");

        expect(tl.debug).toHaveBeenCalledWith(
          expect.stringContaining("API GET '/api/test' succeeded with status 200"),
        );
      });
    });

    describe("logAxiosErrorDetails", () => {
      it("should log error details with response when debug is enabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "true" });
        axiosMock.onGet(`${ENDPOINT.url}/api/test`).reply(500, { error: "Internal Server Error" });

        await expect(() => get(ENDPOINT, "/api/test")).rejects.toThrow();

        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response data:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response status: 500"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Response headers:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error config:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error JSON:"));
      });

      it("should log error details for network error when debug is enabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "true" });
        axiosMock.onGet(`${ENDPOINT.url}/api/test`).networkError();

        await expect(() => get(ENDPOINT, "/api/test")).rejects.toThrow();

        expect(tl.debug).toHaveBeenCalledWith(
          expect.stringContaining("Error setting up the request: Network Error"),
        );
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error config:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error JSON:"));
      });

      it("should log error details for timeout when debug is enabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "true" });
        axiosMock.onGet(`${ENDPOINT.url}/api/test`).timeout();

        await expect(() => get(ENDPOINT, "/api/test")).rejects.toThrow();

        expect(tl.debug).toHaveBeenCalledWith(
          expect.stringContaining("Error setting up the request: timeout of 60000ms exceeded"),
        );
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error config:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error JSON:"));
      });

      it("should not log error details when debug is disabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "false" });
        axiosMock.onGet(`${ENDPOINT.url}/api/test`).reply(500, { error: "Internal Server Error" });

        await expect(() => get(ENDPOINT, "/api/test")).rejects.toThrow();

        expect(tl.debug).not.toHaveBeenCalledWith(expect.stringContaining("Response data:"));
        expect(tl.debug).not.toHaveBeenCalledWith(expect.stringContaining("Error config:"));
        expect(tl.debug).not.toHaveBeenCalledWith(expect.stringContaining("Error JSON:"));
      });

      it("should handle error without request or response when debug is enabled", async () => {
        azureTaskLibMock.setVariables({ "system.debug": "true" });
        axiosMock.onGet(`${ENDPOINT.url}/api/test`).reply(() => {
          const error = new Error("Request setup error") as any;
          error.isAxiosError = true;
          error.toJSON = () => ({ message: "Request setup error" });
          error.config = { url: `${ENDPOINT.url}/api/test` };
          throw error;
        });

        await expect(() => get(ENDPOINT, "/api/test")).rejects.toThrow();

        expect(tl.debug).toHaveBeenCalledWith(
          expect.stringContaining("Error setting up the request:"),
        );
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error config:"));
        expect(tl.debug).toHaveBeenCalledWith(expect.stringContaining("Error JSON:"));
      });
    });
  });
});
