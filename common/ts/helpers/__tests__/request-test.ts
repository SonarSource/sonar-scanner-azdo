// import * as tl from "azure-pipelines-task-lib/task";
// import { SemVer } from "semver";
// import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import * as request from "../request";

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("isString", () => {
  it("should return true", () => {
    const errMessage = "this is the error message";

    const actual = request.isString(errMessage);

    expect(actual).toBe(true);
  });
  it("should return false", () => {
    const value = 28;

    const actual = request.isString(value);

    expect(actual).toBe(false);
  });
});

// describe("getServerVersion", () => {
//   it("should return server version", () => {
//     const endpointData = { url: "http://httpbin.org/anything/" };

//     jest.spyOn(request, "callGet").mockReturnValue("8.0.0.3842");

//     const endpoint = new Endpoint(EndpointType.SonarCloud, endpointData);

//     const actual = request.getServerVersion(endpoint);
//     expect(actual).toBe(new SemVer("8.0.0"));
//   });
// });

// describe("getJSON", () => {
//   it("should return json", () => {
//     const endpointData = { url: "http://httpbin.org" };

//     const endpoint = new Endpoint(EndpointType.SonarCloud, endpointData);

//     const query: request.RequestData = { username: "mickael", location: "geneva" };

//     const actual = request.getJSON(endpoint, "/get", query);
//     const actualJson = JSON.parse(actual);
//     expect(actualJson.args.location).toBe("geneva");
//   });
// });

// describe("get", () => {
//   it("should return query params", () => {
//     jest.spyOn(tl, "debug");

//     const endpointData = { url: "http://httpbin.org" };

//     const endpoint = new Endpoint(EndpointType.SonarCloud, endpointData);

//     const query: request.RequestData = { username: "mickael", location: "geneva" };

//     const actual = request.callGet(endpoint, "/get", true, query);
//     tl.debug(actual);
//     const actualJson = JSON.parse(actual);
//     expect(actualJson.args.location).toBe("geneva");

//     expect(tl.debug).toHaveBeenCalledTimes(1);
//     expect(tl.debug).toHaveBeenNthCalledWith(
//       1,
//       `[SonarScanner] API GET: '/get' with query '{"username":"mickael","location":"geneva"}'`
//     );
//   });

//   it("should handle > 300 status code", () => {
//     jest.spyOn(tl, "debug");

//     const endpointData = { url: "http://httpbin.org" };

//     const endpoint = new Endpoint(EndpointType.SonarCloud, endpointData);

//     const actual = request.callGet(endpoint, "/status/304", true);
//     expect(actual).toContain(
//       "[Error: [SonarScanner] API GET '/status/304' failed, status code was: 304]"
//     );

//     expect(tl.debug).toHaveBeenCalledTimes(1);
//     expect(tl.debug).toHaveBeenNthCalledWith(
//       1,
//       `[SonarScanner] API GET: '/status/304' with query 'undefined'`
//     );
//   });

//   it("should handle auth", () => {
//     jest.spyOn(tl, "debug");

//     const endpointData = { url: "http://httpbin.org" };

//     const endpoint = new Endpoint(EndpointType.SonarCloud, endpointData);

//     endpoint.auth.user = "admin";

//     const actual = request.callGet(endpoint, "/headers", true);
//     const actualJson = JSON.parse(actual);
//     expect(actualJson.headers.Authorization).toBe("Basic YWRtaW46");
//   });
//});
