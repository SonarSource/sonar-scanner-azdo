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
import * as fs from "fs-extra";
import * as path from "path";
import * as azdoApiUtils from "./../helpers/azdo-api-utils";
import { log, LogLevel } from "./logging";

export function publishBuildSummary(summary: string, endpointType = "SonarQube") {
  uploadBuildSummary(saveBuildSummary(summary), `${endpointType} Analysis Report`);
}

export function saveBuildSummary(summary: string): string {
  const filePath = path.join(getStagingDirectory(), "SonarQubeBuildSummary.md");
  fs.writeFileSync(filePath, summary);
  log(LogLevel.DEBUG, `Summary saved at: ${filePath}`);
  return filePath;
}

export function getStagingDirectory(): string {
  const dir = path.join(tl.getVariable("build.artifactStagingDirectory") as string, ".sqAnalysis");
  fs.ensureDirSync(dir);
  return dir;
}

export function uploadBuildSummary(summaryPath: string, title: string): void {
  log(LogLevel.DEBUG, `Uploading build summary from ${summaryPath}`);
  tl.command(
    "task.addattachment",
    {
      type: "Distributedtask.Core.Summary",
      name: title,
    },
    summaryPath,
  );
}

export async function fillBuildProperty(propertyName: string, propertyValue: string) {
  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName,
    propertyValue,
  });

  await azdoApiUtils.addBuildProperty(properties);
}
