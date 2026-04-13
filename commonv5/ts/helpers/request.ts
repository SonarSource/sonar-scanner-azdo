import * as tl from "azure-pipelines-task-lib/task";
import axios from "axios";
import * as semver from "semver";
import Endpoint from "../sonarqube/Endpoint";

export interface RequestData {
  [x: string]: any;
}

export async function get<T>(
  endpoint: Endpoint,
  path: string,
  isJson: boolean,
  query: RequestData = {},
): Promise<T | string> {
  tl.debug(`[SQ] API GET: '${path}'`);

  try {
    const url = endpoint.url + path;
    const auth = Buffer.from(`${endpoint.auth.username}:${endpoint.auth.password ?? ""}`).toString("base64");
    
    const response = await axios.get(url, {
      params: query,
      headers: {
        Authorization: `Basic ${auth}`
      },
      timeout: 60000,
      responseType: isJson ? 'json' : 'text'
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      tl.debug(`[SQ] API GET '${path}' failed, status code was: ${error.response.status}`);
    } else {
      tl.debug(`[SQ] API GET '${path}' failed, error is ${error.message}`);
    }
    throw new Error(`[SQ] API GET '${path}' failed, error is ${error.message}`);
  }
}

export async function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  const serverVersion = await get<string>(endpoint, "/api/server/version", false);
  // SEC-FIX: Validate the version string before using it; do not log raw API response
  const coerced = semver.coerce(serverVersion as string);
  if (!coerced) {
    throw new Error(`[SQ] Invalid server version response from /api/server/version`);
  }
  tl.debug(`[SQ] Server version retrieved successfully.`);
  return coerced;
}
