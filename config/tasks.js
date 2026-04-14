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

/**
 * Tasks that need the msbuild scanner embedded
 */
exports.taskNeedsDotNetScanner = function (taskName) {
  return ["SonarQubePrepare", "SonarCloudPrepare"].includes(taskName);
};

/**
 * Tasks that need the CLI scanner embedded
 */
exports.taskNeedsCliScanner = function (taskName) {
  return ["SonarQubeAnalyze", "SonarCloudAnalyze"].includes(taskName);
};

/**
 * Get the extension of the task
 */
exports.getTaskExtension = function (taskName) {
  if (taskName.startsWith("SonarQube")) {
    return "sonarqube";
  } else {
    return "sonarcloud";
  }
};

/**
 * Get the common folder for the task
 */
exports.getTaskCommonFolder = function (taskName, version) {
  const extension = exports.getTaskExtension(taskName);
  if (extension === "sonarcloud" && version === "v4") {
    return "latest";
  }
  if (extension === "sonarqube" && version === "v8") {
    return "latest";
  }
  return `${extension}-${version}`;
};
