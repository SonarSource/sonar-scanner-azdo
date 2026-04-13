import * as tl from "azure-pipelines-task-lib/task";
import axios from "axios";
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
  // SEC-009: Log only the path, not the full URL with query params
  tl.debug(`[SQ] API GET: '${path}'`);

  try {
    const url = endpoint.url + path;
    const auth = Buffer.from(`${endpoint.auth.user}:${endpoint.auth.pass ?? ""}`).toString("base64");
    
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

export function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  return get(endpoint, "/api/server/version", false).then((version) => {
    // SEC-FIX: Validate version string; do not log raw API response
    const coerced = semver.coerce(version);
    if (!coerced) {
      throw new Error(`[SQ] Invalid server version response from /api/server/version`);
    }
    tl.debug(`[SQ] Server version retrieved successfully.`);
    return coerced;
  });
}
