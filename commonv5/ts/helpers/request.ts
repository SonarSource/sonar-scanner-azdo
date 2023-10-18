import axios from "axios";
import * as semver from "semver";
import * as tl from "azure-pipelines-task-lib/task";
import Endpoint from "../sonarqube/Endpoint";

interface RequestData {
  [x: string]: any;
}

export function get(endpoint: Endpoint, path: string, query?: RequestData): Promise<any> {
  tl.debug(`[SQ] API GET: '${path}' with query "${JSON.stringify(query)}"`);

  return axios({
    url: path,
    method: "get",
    baseURL: endpoint.url,
    auth: {
      username: endpoint.auth.user,
      password: endpoint.auth.pass,
    },
    headers: {
      "User-Agent": undefined,
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
        tl.debug(`API GET error response data: ${JSON.stringify(error.response.data)}`);
      } else {
        tl.debug(`[SQ] API GET '${path}' failed, error is ${error.message}`);
      }
      try {
        tl.debug(`API GET error object: ${JSON.stringify(error)}`);
      } catch {
        //noop
      }
      throw new Error(`[SQ] API GET '${path}' failed, error is ${error.message}`);
    });
}

export function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  return get(endpoint, "/api/server/version").then(semver.coerce);
}
