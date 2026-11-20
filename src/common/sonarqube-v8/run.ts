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

import * as tl from "azure-pipelines-task-lib/task";
import { log, LogLevel, setEndpointType } from "./helpers/logging";
import { EndpointType } from "./sonarqube/Endpoint";

export type TaskJob = (endpointType: EndpointType) => Promise<void>;

export async function runTask(fun: TaskJob, taskName: string, endpointType: EndpointType) {
  setEndpointType(endpointType);

  try {
    await fun(endpointType);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    log(LogLevel.ERROR, `Error while executing task ${taskName}: ${msg}`);
    tl.setResult(tl.TaskResult.Failed, msg);
  }
}
