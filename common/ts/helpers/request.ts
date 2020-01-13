import * as request from "request";
import * as semver from "semver";
import * as tl from "azure-pipelines-task-lib/task";
import Endpoint from "../sonarqube/Endpoint";

export interface RequestData {
  [x: string]: any;
}

export function callGet(
  endpoint: Endpoint,
  path: string,
  isJson: boolean,
  query?: RequestData
): any {
  tl.debug(`[SonarScanner] API GET: '${path}' with query '${JSON.stringify(query)}'`);
  const options: request.CoreOptions = {};
  if (endpoint.auth && endpoint.auth.user) {
    options.auth = endpoint.auth;
  }
  if (query) {
    options.qs = query;
    options.useQuerystring = true;
  }
  request.get(
    {
      baseUrl: endpoint.url,
      uri: path,
      json: isJson,
      ...options
    },
    (error, response, body) => {
      if (error) {
        tl.debug(`[SonarScanner] API GET '${path}' failed, error was: ${JSON.stringify(error)}`);
        return isJson ? {} : "";
      }
      tl.debug(
        `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        const errorMessage = `[SonarScanner] API GET '${path}' failed, status code was: ${response.statusCode}`;
        tl.debug(errorMessage);
        return isJson ? {} : "";
      }
      return body || (isJson ? {} : "");
    }
  );
}

export function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

export function getJSON(endpoint: Endpoint, path: string, query?: RequestData): any {
  return callGet(endpoint, path, true, query);
}

export function getServerVersion(endpoint: Endpoint): semver.SemVer {
  const result = callGet(endpoint, "/api/server/version", false);
  tl.debug(result);
  return semver.coerce(result);
}
