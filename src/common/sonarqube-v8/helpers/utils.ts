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
import { PROP_NAMES } from "./constants";

type ScannerParams = { [key: string]: string | undefined };

export function waitFor(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export function stringifyScannerParams(scannerParams: ScannerParams) {
  return JSON.stringify(
    scannerParams,
    Object.keys(scannerParams).filter((key) => scannerParams[key] != null),
  );
}

export function sanitizeScannerParams(scannerParams: ScannerParams) {
  delete scannerParams[PROP_NAMES.LOGIN];
  delete scannerParams[PROP_NAMES.PASSWORD];
  return scannerParams;
}

export function isWindows() {
  return tl.getPlatform() === tl.Platform.Windows;
}

export function isDebug() {
  return tl.getVariable("system.debug") === "true";
}

export function safeStringify(obj: unknown, space?: number): string {
  const seen = new WeakSet();

  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    },
    space,
  );
}
