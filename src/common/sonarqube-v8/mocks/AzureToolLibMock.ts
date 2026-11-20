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

import * as toolLib from "azure-pipelines-tool-lib/tool";

jest.mock("azure-pipelines-tool-lib/tool");

export class AzureToolLibMock {
  private localToolPath: { [key: string]: string } = {};

  constructor() {
    jest.mocked(toolLib.downloadTool).mockImplementation(this.handleDownloadTool.bind(this));
    jest.mocked(toolLib.extractZip).mockImplementation(this.handleExtractZip.bind(this));
    jest.mocked(toolLib.findLocalTool).mockImplementation(this.handleFindLocalTool.bind(this));
    jest.mocked(toolLib.cacheDir).mockImplementation(this.handleCacheDir.bind(this));
  }

  setLocalToolPath(toolName: string, path: string) {
    this.localToolPath[toolName] = path;
  }

  handleDownloadTool(): Promise<string> {
    return Promise.resolve("/some-path/to/tool");
  }

  handleExtractZip(): Promise<string> {
    return Promise.resolve("/some-path/to/extracted");
  }

  handleFindLocalTool(toolName: string): string {
    return this.localToolPath[toolName] ?? "";
  }

  handleCacheDir(): Promise<string> {
    return Promise.resolve("/some-path/to/cached");
  }

  reset() {
    this.localToolPath = {};

    jest.mocked(toolLib.downloadTool).mockClear();
    jest.mocked(toolLib.extractZip).mockClear();
    jest.mocked(toolLib.findLocalTool).mockClear();
    jest.mocked(toolLib.cacheDir).mockClear();
  }
}
