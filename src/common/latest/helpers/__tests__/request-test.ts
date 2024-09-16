import axios from "axios";
import AxiosMock from "axios-mock-adapter";
import * as tl from "azure-pipelines-task-lib/task";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";
import { AzureTaskLibMock } from "../../mocks/AzureTaskLibMock";
import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import { get, getServerVersion } from "../request";

const axiosMock = new AxiosMock(axios);
const azureTaskLibMock = new AzureTaskLibMock();

const ENDPOINT = new Endpoint(EndpointType.SonarQube, {
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
    it("should get a JSON response with auth", async () => {
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
        auth: {
          username: "the-token",
          password: "",
        },
        timeout: Endpoint.REQUEST_TIMEOUT,
      });
    });

    it("should get a JSON response with password auth", async () => {
      const endpoint = new Endpoint(EndpointType.SonarQube, {
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
        "GET request '/api/server/version' failed. Error message: Network Error",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `GET request '/api/server/version' failed. Error message: Network Error`,
      );
    });

    it("get with error", async () => {
      axiosMock
        .onGet(`${ENDPOINT.url}/api/server/version`, { params: { a: "b" } })
        .reply(500, "some error");

      await expect(() => get(ENDPOINT, "/api/server/version", { a: "b" })).rejects.toThrow(
        "GET request '/api/server/version' failed. Status code was: 500",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `GET request '/api/server/version' failed. Status code was: 500`,
      );
    });

    it("get with timeout", async () => {
      axiosMock.onGet(`${ENDPOINT.url}/api/server/version`, { params: { a: "b" } }).timeout();

      await expect(() => get(ENDPOINT, "/api/server/version", { a: "b" })).rejects.toThrow(
        "GET request '/api/server/version' failed. Error message: timeout of 60000ms exceeded",
      );

      expect(tl.debug).toHaveBeenCalledWith(
        `GET request '/api/server/version' failed. Error message: timeout of 60000ms exceeded`,
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
      const endpoint = new Endpoint(EndpointType.SonarQube, { url: "https://endpoint.url" });

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
      const endpoint = new Endpoint(EndpointType.SonarQube, { url: "http://endpoint.url" });

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
      axiosMock.onGet(`${ENDPOINT.url}/api/server/version`).reply(200, "7.9.1.48248");

      const semver = await getServerVersion(ENDPOINT);
      expect(semver.toString()).toEqual("7.9.1");

      expect(tl.debug).toHaveBeenCalledWith(`Server version: 7.9.1.48248`);
    });
  });
});
