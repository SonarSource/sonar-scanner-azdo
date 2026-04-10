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

const path = require("path");
const fs = require("fs-extra");

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
function resolveRelativePath(relativePath) {
  return path.resolve(appDirectory, relativePath);
}
exports.resolveRelativePath = resolveRelativePath;

// /src
exports.SOURCE_DIR = path.join(appDirectory, "src");

// /build
exports.BUILD_DIR = path.join(appDirectory, "build");

// /build/ts
exports.BUILD_TS_DIR = path.join(appDirectory, "build", "ts");

// /build/extension
exports.BUILD_EXTENSION_DIR = path.join(appDirectory, "build", "extensions");

// /build/scanner
exports.BUILD_SCANNER_DIR = path.join(appDirectory, "build", "scanner");

// /build/scanner/classic-sonar-scanner-msbuild
exports.BUILD_SCANNER_CLI_DIR = path.join(
  appDirectory,
  "build",
  "scanner",
  "classic-sonar-scanner-msbuild",
);

// /build/scanner/dotnet-sonar-scanner-msbuild
exports.BUILD_SCANNER_MSBUILD_DIR = path.join(
  appDirectory,
  "build",
  "scanner",
  "dotnet-sonar-scanner-msbuild",
);

// /dist
exports.DIST_DIR = path.join(appDirectory, "dist");

exports.BUILD_SCANNER_NET_FRAMEWORK_DIRNAME = "classic-sonar-scanner-msbuild";
exports.BUILD_SCANNER_NET_DOTNET_DIRNAME = "dotnet-sonar-scanner-msbuild";
exports.BUILD_SCANNER_CLI_DIRNAME = "sonar-scanner-cli";
