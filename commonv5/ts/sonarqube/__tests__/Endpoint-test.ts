import * as tl from "azure-pipelines-task-lib/task";
import { PROP_NAMES } from "../../helpers/constants";
import Endpoint, { EndpointType } from "../Endpoint";

beforeEach(() => {
  jest.restoreAllMocks();
});

// VSTS-134
it("should not return null password", () => {
  jest.spyOn(tl, "getHttpProxyConfiguration").mockReturnValue(null);
  // Allow HTTP for this test (testing auth, not URL validation)
  jest.spyOn(tl, "getBoolInput").mockReturnValue(true);

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

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.CodeScanCloud);

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

  const result = Endpoint.getEndpoint("sonarcloud", EndpointType.CodeScanCloud);

  expect(result.toSonarProps("8.2.4")).not.toContain(PROP_NAMES.LOGIN);
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

// Feature: security-remediation, Property 4: HTTPS URL enforcement
// **Validates: Requirements 6.1, 6.4**
import * as fc from "fast-check";

describe("Property 4: HTTPS URL enforcement", () => {
  const hostArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 20 });
  const pathArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789/-_'.split('')), { minLength: 0, maxLength: 30 });

  const httpUrlArb = fc.tuple(hostArb, pathArb).map(([host, path]) => `http://${host}.example.com${path ? '/' + path : ''}`);
  const httpsUrlArb = fc.tuple(hostArb, pathArb).map(([host, path]) => `https://${host}.example.com${path ? '/' + path : ''}`);

  const endpointData = (url: string) => ({
    url,
    token: "test-token",
    username: undefined,
    password: undefined,
    organization: undefined,
  });

  it("http:// URL with allowInsecureConnection=false should throw 'HTTPS is required'", () => {
    fc.assert(
      fc.property(httpUrlArb, (url) => {
        jest.spyOn(tl, "getBoolInput").mockReturnValue(false);
        expect(() => new Endpoint(EndpointType.SonarQube, endpointData(url))).toThrow("HTTPS is required");
      }),
      { numRuns: 100 },
    );
  });

  it("http:// URL with allowInsecureConnection=true should succeed", () => {
    fc.assert(
      fc.property(httpUrlArb, (url) => {
        jest.spyOn(tl, "getBoolInput").mockReturnValue(true);
        const endpoint = new Endpoint(EndpointType.SonarQube, endpointData(url));
        expect(endpoint.url).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  it("https:// URL should always succeed regardless of allowInsecureConnection", () => {
    fc.assert(
      fc.property(httpsUrlArb, fc.boolean(), (url, allowInsecure) => {
        jest.spyOn(tl, "getBoolInput").mockReturnValue(allowInsecure);
        const endpoint = new Endpoint(EndpointType.SonarQube, endpointData(url));
        expect(endpoint.url).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: security-remediation, Property 13: Endpoint redacted serialization
// **Validates: Requirements 14.2**
describe("Property 13: Endpoint redacted serialization", () => {
  // Generate non-empty alphanumeric strings for credential fields
  const nonEmptyStringArb = fc.stringOf(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 1, maxLength: 30 },
  );

  // Generate a valid HTTPS host
  const hostArb = fc.stringOf(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")),
    { minLength: 1, maxLength: 15 },
  );

  // Generate random EndpointData with non-empty credentials
  const endpointDataArb = fc.record({
    url: hostArb.map((host) => `https://${host}.example.com`),
    token: nonEmptyStringArb,
    username: nonEmptyStringArb,
    password: nonEmptyStringArb,
    organization: nonEmptyStringArb,
  });

  const endpointTypeArb = fc.constantFrom(
    EndpointType.SonarQube,
    EndpointType.SonarCloud,
    EndpointType.CodeScanCloud,
  );

  it("toRedactedJson replaces all credential fields with [REDACTED]", () => {
    fc.assert(
      fc.property(endpointDataArb, endpointTypeArb, (data, type) => {
        const endpoint = new Endpoint(type, data);
        const redacted = JSON.parse(endpoint.toRedactedJson());

        expect(redacted.data.token).toBe("[REDACTED]");
        expect(redacted.data.username).toBe("[REDACTED]");
        expect(redacted.data.password).toBe("[REDACTED]");
      }),
      { numRuns: 100 },
    );
  });

  it("toRedactedJson preserves URL, type, and organization unchanged", () => {
    fc.assert(
      fc.property(endpointDataArb, endpointTypeArb, (data, type) => {
        const endpoint = new Endpoint(type, data);
        const redacted = JSON.parse(endpoint.toRedactedJson());

        expect(redacted.data.url).toBe(data.url);
        expect(redacted.type).toBe(type);
        expect(redacted.data.organization).toBe(data.organization);
      }),
      { numRuns: 100 },
    );
  });

  it("toRedactedJson output never contains original credential values", () => {
    fc.assert(
      fc.property(endpointDataArb, endpointTypeArb, (data, type) => {
        const endpoint = new Endpoint(type, data);
        const redactedStr = endpoint.toRedactedJson();

        expect(redactedStr).not.toContain(data.token);
        expect(redactedStr).not.toContain(data.username);
        expect(redactedStr).not.toContain(data.password);
      }),
      { numRuns: 100 },
    );
  });
});
