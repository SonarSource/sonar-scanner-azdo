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

export type YamlContent = { [key: string]: unknown };

export type TaskDefinition = Partial<{
  task: string;
  script: string;
  workingDirectory: string;
  inputs: YamlContent;
}>;

export type PipelineCombination = {
  // OS to run on
  os: "unix" | "windows";

  // Version of the tasks to use (incl. extension)
  version:
    | {
        extension: "sonarcloud";
        version: 3 | 4;
      }
    | {
        extension: "sonarqube" | "sonarqube:lts";
        version: 7 | 8;
      };

  // Scanner to use
  scanner:
    | {
        type: "cli" | "dotnet";
        version?: string;
      }
    | {
        type: "other";
        subtype: "gradle" | "maven";
      };
};
