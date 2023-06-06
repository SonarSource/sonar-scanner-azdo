import Endpoint, { EndpointType } from "../../sonarqube/Endpoint";
import { getJSON } from "../request";

const mockCallback = jest.fn((_options, cb) => cb(null, {name:'a'}, null));

jest.mock('request', () => ({
  get: (options, cb) => mockCallback(options, cb)
}));

describe('request', () => {
  test("should setup timeout", () => {
    const url = 'localhost';
    const token = 'apitoken';
    const username ='username';
    const password = 'password';
    const organization = 'organization';
    const endpoint = new Endpoint(
      EndpointType.SonarCloud,
      { url, token, username, password, organization }
    );
    const analysisId = '12345';
    const query = { analysisId };
    getJSON(endpoint, 'path', query).then(
      () => true,
      () => false
    );
    expect(mockCallback).toBeCalledWith(
      expect.objectContaining({timeout: 10000})
    , expect.any(Function));
  });
})