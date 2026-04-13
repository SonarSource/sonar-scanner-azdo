import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "../../helpers/utils";
import Endpoint, { EndpointType } from "../Endpoint";

beforeEach(() => {
  jest.restoreAllMocks();
});

// VSTS-134
it("should not return null password", () => {
  // Allow HTTP for this test (testing auth, not URL validation)
  jest.spyOn(tl, "getBoolInput").mockReturnValue(true);
  const enpoint = new Endpoint(EndpointType.SonarQube, {
    url: "http://foo",
    token: undefined,
    username: "token123",
    password: undefined,
    organization: undefined,
  });
  expect(enpoint.auth).toEqual({ user: "token123" });
});

// VSTS-250
it("On SonarCloud password is always null", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://sonarcloud.io");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getInput").mockImplementation(() => "organization");

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.CodeScanCloud);

  expect(result.toSonarProps()[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.pass).toBeUndefined();
});

// VSTS-250
it("On SonarQube password is empty should not be intepreted", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);

  expect(result.toSonarProps()[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.pass).toBeUndefined();
});

// VSTS-250
it("On SonarQube password is not empty should be intepreted", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("P@ssword");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);

  expect(result.toSonarProps()[PROP_NAMES.PASSSWORD]).toEqual("P@ssword");
  expect(result.auth.pass).toEqual("P@ssword");
});

// SEC-007: HTTPS enforcement
it("should reject HTTP URLs when allowInsecureConnection is false", () => {
  jest.spyOn(tl, "getBoolInput").mockReturnValue(false);
  expect(() => {
    new Endpoint(EndpointType.SonarQube, {
      url: "http://insecure-server",
      token: "token123",
      username: undefined,
      password: undefined,
      organization: undefined,
    });
  }).toThrow("HTTPS is required");
});

it("should allow HTTP URLs when allowInsecureConnection is true", () => {
  jest.spyOn(tl, "getBoolInput").mockReturnValue(true);
  const endpoint = new Endpoint(EndpointType.SonarQube, {
    url: "http://localhost:9000",
    token: "token123",
    username: undefined,
    password: undefined,
    organization: undefined,
  });
  expect(endpoint.url).toBe("http://localhost:9000");
});

it("should always allow HTTPS URLs", () => {
  const endpoint = new Endpoint(EndpointType.SonarQube, {
    url: "https://secure-server.com",
    token: "token123",
    username: undefined,
    password: undefined,
    organization: undefined,
  });
  expect(endpoint.url).toBe("https://secure-server.com");
});

// SEC-009: Redacted JSON
it("toRedactedJson should mask credentials", () => {
  jest.spyOn(tl, "getBoolInput").mockReturnValue(true);
  const endpoint = new Endpoint(EndpointType.SonarQube, {
    url: "http://localhost:9000",
    token: "secret-token",
    username: "admin",
    password: "secret-pass",
    organization: "my-org",
  });
  const redacted = JSON.parse(endpoint.toRedactedJson());
  expect(redacted.data.token).toBe("[REDACTED]");
  expect(redacted.data.username).toBe("[REDACTED]");
  expect(redacted.data.password).toBe("[REDACTED]");
  expect(redacted.data.url).toBe("http://localhost:9000");
  expect(redacted.data.organization).toBe("my-org");
});
