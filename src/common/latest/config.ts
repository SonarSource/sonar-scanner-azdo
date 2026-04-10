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

// When the user does not specify a specific version, these will be the default versions used.
const dotnetScannerVersion = "11.2.1.137242";
const cliScannerVersion = "8.0.1.6346";

// MSBUILD scanner location
const dotnetScannersBaseUrl = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/`;

// CLI scanner location
const cliScannerBaseUrl = "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/";

function getDotnetFrameworkFilename(dotnetScannerVersion: string) {
  return `sonar-scanner-${dotnetScannerVersion}-net-framework.zip`;
}

function getDotnetetCoreFilename(dotnetScannerVersion: string) {
  return `sonar-scanner-${dotnetScannerVersion}-net.zip`;
}

function getCliScannerFilename(cliScannerVersion: string) {
  return `sonar-scanner-cli-${cliScannerVersion}.zip`;
}

function dotnetScannerUrlTemplate(dotnetScannerVersion: string, framework: boolean) {
  const filename = framework
    ? getDotnetFrameworkFilename(dotnetScannerVersion)
    : getDotnetetCoreFilename(dotnetScannerVersion);
  return `${dotnetScannersBaseUrl}${dotnetScannerVersion}/${filename}`;
}

function cliUrlTemplate(cliScannerVersion: string) {
  return `${cliScannerBaseUrl}${getCliScannerFilename(cliScannerVersion)}`;
}

export const scanner = {
  dotnetScannerVersion,
  cliScannerVersion,
  classicUrl: dotnetScannerUrlTemplate(dotnetScannerVersion, true),
  dotnetUrl: dotnetScannerUrlTemplate(dotnetScannerVersion, false),
  cliUrl: cliUrlTemplate(cliScannerVersion),

  dotnetScannerUrlTemplate,
  cliUrlTemplate,
};
