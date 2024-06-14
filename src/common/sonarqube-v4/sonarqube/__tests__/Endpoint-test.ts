import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "../../helpers/utils";
import Endpoint, { EndpointType } from "../Endpoint";

beforeEach(() => {
  jest.restoreAllMocks();
});

// SONARAZDO-134
it("should not return null password", () => {
  const enpoint = new Endpoint(EndpointType.SonarQube, {
    url: "http://foo",
    token: undefined,
    username: "token123",
    password: undefined,
    organization: undefined,
  });
  expect(enpoint.auth).toEqual({ user: "token123" });
});

// SONARAZDO-250
it("On SonarCloud password is always null", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://sonarcloud.io");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getInput").mockImplementation(() => "organization");

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.SonarCloud);

  expect(result.toSonarProps()[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.pass).toBeUndefined();
});

// SONARAZDO-250
it("On SonarQube password is empty should not be intepreted", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);

  expect(result.toSonarProps()[PROP_NAMES.PASSSWORD]).toBeNull();
  expect(result.auth.pass).toBeUndefined();
});

// SONARAZDO-250
it("On SonarQube password is not empty should be intepreted", () => {
  jest.spyOn(tl, "getEndpointUrl").mockImplementation(() => "https://localhost:9000");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("username1243");
  jest.spyOn(tl, "getEndpointAuthorizationParameter").mockReturnValueOnce("P@ssword");

  const result = Endpoint.getEndpoint("sonarqube", EndpointType.SonarQube);

  expect(result.toSonarProps()[PROP_NAMES.PASSSWORD]).toEqual("P@ssword");
  expect(result.auth.pass).toEqual("P@ssword");
});
