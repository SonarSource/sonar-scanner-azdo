import axios from "axios";
import * as semver from "semver";
import * as tl from "azure-pipelines-task-lib/task";
import * as request from 'request'

require('request-debug')(request);

interface RequestData {
  [x: string]: any;
}

axios.interceptors.request.use(request => {
  console.log('Starting Request', JSON.stringify(request, null, 2))
  return request
})
axios.interceptors.response.use(response => {
  console.log('Response:', JSON.stringify(response, null, 2))
  return response
})

export function get(endpoint: any, path: string, query?: RequestData): Promise<any> {
  tl.debug(`[SQ] API GET: '${path}' with query "${JSON.stringify(query)}"`);

  return axios({
    url: path,
    method: "get",
    baseURL: endpoint.url,
    auth: {
      username: endpoint.auth.user,
      password: endpoint.auth.pass,
    },
    params: query,
    timeout: 60000,
  })
    .then((response) => {
      tl.debug(`Response: ${response.status} Body: "${response.data}"`);

      return response.data;
    })
    .catch((error) => {
      if (error.response) {
        tl.debug(`[SQ] API GET '${path}' failed, status code was: ${error.response.status}`);
      } else {
        tl.debug(`[SQ] API GET '${path}' failed, error is ${error.message}`);
      }
      throw new Error(`[SQ] API GET '${path}' failed, error is ${error.message}`);
    });
}

export function requestTest(endpoint: any, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options: request.CoreOptions = {
      auth: endpoint.auth,
    };
    request.get(
      {
        method: "GET",
        baseUrl: endpoint.url,
        uri: path,
        json: false,
        ...options,
      },
      (error, response, body) => {
        if (error) {
          return logAndReject(
            reject,
            `[SQ] API GET '${path}' failed, error was: ${JSON.stringify(error)}`
          );
        }
        tl.debug(
          `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
        );
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return logAndReject(
            reject,
            `[SQ] API GET '${path}' failed, status code was: ${response.statusCode}`
          );
        }
        return resolve(body || "");
      }
    );
  });
}

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

function logAndReject(reject, errMsg) {
  tl.debug(errMsg);
  return reject(new Error(errMsg));
}

export function getServerVersion(endpoint: any): Promise<semver.SemVer> {
  return get(endpoint, "/api/server/version").then(semver.coerce);
}

getServerVersion({url: "https://sonarcloud.io", auth: {user: "dummy", pass: "dummy"}})
requestTest({url: "https://sonarcloud.io", auth: {user: "dummy", pass: "dummy"}}, "/api/server/version")