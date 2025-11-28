/*
 * sonar-scanner-npm
 * Copyright (C) 2022-2024 SonarSource Sàrl
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
import { EndpointType } from "../sonarqube";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const LOG_MESSAGE_PADDING = 7;

let endpointType: EndpointType | undefined;

export function log(level: LogLevel, message: string) {
  const levelStr = `[${level}]`.padEnd(LOG_MESSAGE_PADDING);
  const msgStr = [levelStr, `${endpointType ?? EndpointType.Server}:`, message].join(" ");
  switch (level) {
    case LogLevel.ERROR:
      tl.error(msgStr);
      break;
    case LogLevel.WARN:
      tl.warning(msgStr);
      break;
    case LogLevel.INFO:
      console.log(msgStr);
      break;
    default:
      tl.debug(msgStr);
      break;
  }
}

export function setEndpointType(newEndpointType: EndpointType) {
  endpointType = newEndpointType;
}
