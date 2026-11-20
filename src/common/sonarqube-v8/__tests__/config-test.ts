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

import { scanner } from "../config";

describe("config", () => {
  it("dotnetScannerUrlTemplate should accept a version and boolean for platform", () => {
    expect(scanner.dotnetScannerUrlTemplate("1.33.7", true)).toBe(
      "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/1.33.7/sonar-scanner-1.33.7-net-framework.zip",
    );

    expect(scanner.dotnetScannerUrlTemplate("1.33.7", false)).toBe(
      "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/1.33.7/sonar-scanner-1.33.7-net.zip",
    );
  });
  it("cliUrlTemplate should accept a version", () => {
    expect(scanner.cliUrlTemplate("1.33.7")).toBe(
      "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-1.33.7.zip",
    );
  });
});
