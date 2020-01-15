import Endpoint, { EndpointType } from "../Endpoint";

// VSTS-134
it("should not return null password", () => {
  const enpoint = new Endpoint(EndpointType.SonarQube, {
    url: "http://foo",
    token: undefined,
    username: "token123",
    password: undefined,
    organization: undefined
  });
  expect(enpoint.auth).toEqual({ user: "token123" });
});
