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

import { PipelineCombination } from "./types";

export function generateCombinations(): PipelineCombination[] {
  let osCombinations: PipelineCombination["os"][];
  switch(process.env.RUN_ON_OS) {
      case "unix": osCombinations = ["unix"]; break;
      case "windows": osCombinations = ["windows"]; break;
      case undefined: osCombinations = ["unix", "windows"]; break;
      default: throw new Error(`Invalid OS combination: ${process.env.RUN_ON_OS}`);
  };
  let versionCombinations: PipelineCombination["version"][];
  switch(process.env.TASK_VERSION) {
      case "3": versionCombinations = [{ extension: "sonarcloud", version: 3 }]; break;
      case "4": versionCombinations = [{ extension: "sonarcloud", version: 4 }]; break;
      case undefined: versionCombinations = [
        { extension: "sonarcloud", version: 3 },
        { extension: "sonarcloud", version: 4 },
      ]; break;
      default: throw new Error(`Invalid task version combination: ${process.env.TASK_VERSION}`);
  };
  const scannerCombinations: PipelineCombination["scanner"][] = [
    { type: "cli" },
    { type: "cli", version: "6.2.1.4610" },
    { type: "dotnet" },
    { type: "dotnet", version: "8.0.3.99785" },
    { type: "other", subtype: "gradle" },
    { type: "other", subtype: "maven" },
  ];

  const combinations: PipelineCombination[] = [];
  for (const os of osCombinations) {
    for (const version of versionCombinations) {
      for (const scanner of scannerCombinations) {
        combinations.push({ os, version, scanner });
      }
    }
  }

  return combinations;
}

export function serializeCombination(config: PipelineCombination) {
  return [
    config.version.extension,
    `v${config.version.version}`,
    config.scanner.type,
    config.scanner.type === "other"
      ? config.scanner.subtype
      : (config.scanner.version ?? "embedded"),
    config.os,
  ].join("-");
}
