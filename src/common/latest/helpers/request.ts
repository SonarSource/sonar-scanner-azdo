import axios from "axios";
import * as semver from "semver";
import Endpoint from "../sonarqube/Endpoint";
import { log, LogLevel } from "./logging";

export interface RequestData {
  [x: string]: string;
}

export async function get<T>(endpoint: Endpoint, path: string, query?: RequestData): Promise<T> {
  const fullUrl = endpoint.url + path;
  log(
    LogLevel.DEBUG,
    `API GET: '${path}' with full URL "${fullUrl}" and query "${JSON.stringify(query)}"`,
  );

  try {
    const response = await axios.get<T>(fullUrl, {
      params: query,
      ...endpoint.toAxiosOptions(),
    });
    return response.data;
  } catch (error: unknown) {
    let msg = `API GET '${path}' failed.`;
    if (error instanceof Error) {
      msg += ` Error message: ${error.message}.`;
    }
    log(LogLevel.DEBUG, msg);
    throw new Error(msg);
  }
}

export async function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  const serverVersion = await get<string>(endpoint, "/api/server/version");
  const serverVersionCoerced = semver.coerce(serverVersion);
  if (!serverVersionCoerced) {
    throw new Error(`Failed to parse server version: ${serverVersion}`);
  }
  log(LogLevel.INFO, `Server version: ${serverVersion}`);
  return serverVersionCoerced;
}
