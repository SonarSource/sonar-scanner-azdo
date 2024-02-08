import * as tl from "azure-pipelines-task-lib/task";
import fetch from "node-fetch";
import * as semver from "semver";
import Endpoint from "../sonarqube/Endpoint";

interface RequestData {
  [x: string]: any;
}

export async function get(
  endpoint: Endpoint,
  path: string,
  isJson: boolean,
  query: RequestData = {},
): Promise<any> {
  tl.debug(`[SQ] API GET: '${path}' with query "${JSON.stringify(query)}"`);

  try {
    let url = endpoint.url + path;

    Object.keys(query).forEach((key, i) => {
      url += i === 0 ? "?" : "&";
      url += `${key}=${query[key]}`;
    });

    const response = await fetch(url, endpoint.toFetchOptions(url));

    if (isJson) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    if (error.response) {
      tl.debug(`[SQ] API GET '${path}' failed, status code was: ${error.response.status}`);
    } else {
      tl.debug(`[SQ] API GET '${path}' failed, error is ${error.message}`);
    }
    throw new Error(`[SQ] API GET '${path}' failed, error is ${error.message}`);
  }
}

export function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  return get(endpoint, "/api/server/version", false).then(semver.coerce);
}
