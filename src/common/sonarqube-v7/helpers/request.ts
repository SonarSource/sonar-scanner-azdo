/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

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
