import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "../../helpers/constants";
import Endpoint, { EndpointType } from "../Endpoint";

beforeEach(() => {
  jest.restoreAllMocks();
});

// VSTS-134
it("should not return null password", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);

  const enpoint = new Endpoint(EndpointType.SonarQube, {
    url: "http://foo",
    token: undefined,
    username: "token123",
    password: undefined,
    organization: undefined,
  });
  expect(enpoint.auth).toEqual({ username: "token123", password: "" });
});

// VSTS-250
it("On SonarCloud password is always null", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://sonarcloud.io");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getInput").mockImplementation(() => "organization");

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.SonarCloud);

  expect(result.toSonarProps("7.1.0")[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.password).toEqual("");
});

// VSTS-250
it("On SonarQube password is empty should not be intepreted", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);

  expect(result.toSonarProps("7.1.0")[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.password).toEqual("");
});

// VSTS-250
it("On SonarQube password is not empty should be intepreted", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("P@ssword");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);

  expect(result.toSonarProps("7.1.0")[PROP_NAMES.PASSSWORD]).toEqual("P@ssword");
  expect(result.auth.password).toEqual("P@ssword");
});

// VSTS-302
it("For SonarQube version >= 10.0.0 token field is used instead of login", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("tokenvalue");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);
  expect(result.toSonarProps("10.0.0")).not.toContain(PROP_NAMES.LOGIN);
});

// VSTS-302
it("For SonarQube version < 10.0.0 login is used", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("tokenvalue");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);
  expect(result.toSonarProps("9.9.1")[PROP_NAMES.LOGIN]).toBe("tokenvalue");
});

// VSTS-302 + VSTS-310
it("On SonarCloud token field is used instead of login", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://sonarcloud.io");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("tokenvalue");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getInput").mockImplementation(() => "organization");

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.SonarCloud);

  expect(result.toSonarProps("8.2.4")).not.toContain(PROP_NAMES.LOGIN);
});
