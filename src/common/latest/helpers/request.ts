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
  } catch (error) {
    let msg = `API GET '${path}' failed.`;
    if (error.response) {
      msg += ` Status code was: ${error.response.status}`;
    } else {
      msg += ` Error message: ${error.message}`;
    }
    log(LogLevel.DEBUG, msg);
    throw new Error(msg);
  }
}

export async function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  const serverVersion = await get<string>(endpoint, "/api/server/version");
  log(LogLevel.INFO, `Server version: ${serverVersion}`);
  return semver.coerce(serverVersion);
}
