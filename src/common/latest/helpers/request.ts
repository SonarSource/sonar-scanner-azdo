import * as tl from "azure-pipelines-task-lib/task";
import fetch from "node-fetch";
import * as semver from "semver";
import Endpoint from "../sonarqube/Endpoint";

export interface RequestData {
  [x: string]: string;
}

export async function get<T>(
  endpoint: Endpoint,
  path: string,
  isJson: boolean,
  query?: RequestData,
): Promise<T | string> {
  const hasQuery = query && Object.keys(query).length > 0;
  const fullUrl =
    endpoint.url + path + (hasQuery ? "?" + new URLSearchParams(query).toString() : "");
  tl.debug(
    `[SQ] API GET: '${path}' with full URL "${fullUrl}" and query "${JSON.stringify(query)}"`,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, Endpoint.REQUEST_TIMEOUT);

  try {
    const response = await fetch(fullUrl, endpoint.toFetchOptions(fullUrl, controller.signal));
    if (isJson) {
      return (await response.json()) as T;
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
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  const serverVersion = await get<string>(endpoint, "/api/server/version", false);
  tl.debug(`[SQ] Server version: ${serverVersion}`);
  return semver.coerce(serverVersion);
}
