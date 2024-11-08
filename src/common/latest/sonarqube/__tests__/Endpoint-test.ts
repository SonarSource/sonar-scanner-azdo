import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "../../helpers/constants";
import Endpoint, { EndpointType } from "../Endpoint";

beforeEach(() => {
  jest.restoreAllMocks();
});

// SONARAZDO-134
it("should not return null password", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);

  const endpoint = new Endpoint(EndpointType.Server, {
    url: "http://foo",
    token: undefined,
    username: "token123",
    password: undefined,
    organization: undefined,
  });
  expect(endpoint.auth).toEqual({ username: "token123", password: "" });
});

// SONARAZDO-250
it("On SonarQube Cloud, password is always null", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://sonarcloud.io");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getInput").mockImplementation(() => "organization");

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.Cloud);

  expect(result.toSonarProps("7.1.0")[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.password).toBe("");
});

// SONARAZDO-250
it("On SonarQube Server, password is empty should not be intepreted", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.Server);

  expect(result.toSonarProps("7.1.0")[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.password).toBe("");
});

// SONARAZDO-250
it("On SonarQube Server password is not empty should be intepreted", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("P@ssword");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.Server);

  expect(result.toSonarProps("7.1.0")[PROP_NAMES.PASSSWORD]).toEqual("P@ssword");
  expect(result.auth.password).toEqual("P@ssword");
});

// SONARAZDO-302
it("For SonarQube Server version >= 10.0.0 token field is used instead of login", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("tokenvalue");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.Server);
  expect(result.toSonarProps("10.0.0")).not.toContain(PROP_NAMES.LOGIN);
});

// SONARAZDO-302
it("For SonarQube Server version < 10.0.0 login is used", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("tokenvalue");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.Server);
  expect(result.toSonarProps("9.9.1")[PROP_NAMES.LOGIN]).toBe("tokenvalue");
});

// SONARAZDO-302 + SONARAZDO-310
it("On SonarQube Cloud, token field is used instead of login", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://sonarcloud.io");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("tokenvalue");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getInput").mockImplementation(() => "organization");

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.Cloud);

  expect(result.toSonarProps("8.2.4")).not.toContain(PROP_NAMES.LOGIN);
});
