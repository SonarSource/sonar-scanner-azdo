import axios, { AxiosError, AxiosResponse } from "axios";
import * as semver from "semver";
import Endpoint from "../sonarqube/Endpoint";
import { log, LogLevel } from "./logging";
import { isDebug, safeStringify } from "./utils";

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

    logAxiosResponseDetails(path, response);
    return response.data;
  } catch (error: unknown) {
    let msg = `API GET '${path}' failed.`;

    if (axios.isAxiosError(error)) {
      msg += ` Axios Error message: ${error.message}.`;
      logAxiosErrorDetails(error);
    } else if (error instanceof Error) {
      msg += ` Error message: ${error.message}.`;
      log(LogLevel.DEBUG, msg);
    } else {
      msg += ` An unknown error occurred.`;
    }

    log(LogLevel.DEBUG, msg);
    throw new Error(msg);
  }
}

function logAxiosResponseDetails(path: string, response: AxiosResponse) {
  if (!isDebug()) {
    return;
  }

  log(LogLevel.DEBUG, `API GET '${path}' succeeded with status ${response.status}.`);
  log(LogLevel.DEBUG, `Response request: ${safeStringify(response.request)}`);
  log(LogLevel.DEBUG, `Response headers: ${safeStringify(response.headers)}`);
  log(LogLevel.DEBUG, `Response data: ${safeStringify(response.data)}`);
  log(LogLevel.DEBUG, `Response config: ${safeStringify(response.config)}`);
}

function logAxiosErrorDetails(error: AxiosError) {
  if (!isDebug()) {
    return;
  }

  if (error.response) {
    log(LogLevel.DEBUG, `Response data: ${safeStringify(error.response.data)}`);
    log(LogLevel.DEBUG, `Response status: ${error.response.status}`);
    log(LogLevel.DEBUG, `Response headers: ${safeStringify(error.response.headers)}`);
  } else if (error.request) {
    // The request was made but no response was received
    log(LogLevel.DEBUG, "No response received from server.");
    log(LogLevel.DEBUG, `Error request: ${safeStringify(error.request)}`);
  } else {
    // Something happened in setting up the request that triggered an Error
    log(LogLevel.DEBUG, `Error setting up the request: ${error.message}.`);
  }

  log(LogLevel.DEBUG, `Error config: ${safeStringify(error.config)}`);
  log(LogLevel.DEBUG, `Error JSON: ${JSON.stringify(error.toJSON())}`);
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
