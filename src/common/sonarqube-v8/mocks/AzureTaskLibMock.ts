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
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";

jest.mock("azure-pipelines-task-lib/task");
jest.mock("azure-pipelines-task-lib/toolrunner");

const DEFAULT_INPUTS = {
  cliProjectKey: "projectKey",
};

export class AzureTaskLibMock {
  platform: tl.Platform = tl.Platform.Linux;
  inputs: { [key: string]: string } = {};
  variables: { [key: string]: string } = {};
  lastToolRunner?: ToolRunner;
  result: { result: tl.TaskResult; message: string } | undefined;

  constructor() {
    jest.mocked(tl.getInput).mockImplementation(this.handleGetInput.bind(this));
    jest.mocked(tl.getVariable).mockImplementation(this.handleGetVariable.bind(this));
    jest.mocked(tl.getDelimitedInput).mockImplementation(this.handleGetDelimitedInput.bind(this));
    jest.mocked(tl.setVariable).mockImplementation(this.handleSetVariable.bind(this));
    jest.mocked(tl.setResult).mockImplementation(this.handleSetResult.bind(this));
    jest
      .mocked(tl.getEndpointAuthorization)
      .mockImplementation(this.handleGetEndpointAuthorization.bind(this));
    jest.mocked(tl.getPlatform).mockImplementation(() => this.platform);
    jest.mocked(tl.tool).mockImplementation(this.handleTool.bind(this));
    jest.mocked(tl.resolve).mockImplementation((...paths) => paths.join("/"));
    jest.mocked(tl.findMatch).mockImplementation(this.handleFindMatch);
    jest.mocked(tl.which).mockImplementation((path) => `/bin/${path}`);
    jest.mocked(tl.error).mockImplementation(() => {});
    jest.mocked(tl.debug).mockImplementation(() => {});

    this.reset();
  }

  setInputs(inputs: { [key: string]: string | undefined }) {
    for (const key in inputs) {
      if (inputs[key] !== undefined) {
        this.inputs[key] = inputs[key];
      }
    }
  }

  setVariables(variables: { [key: string]: string }) {
    this.variables = {
      ...this.variables,
      ...variables,
    };
  }

  setPlatform(platform: tl.Platform) {
    this.platform = platform;
  }

  getLastToolRunner() {
    return this.lastToolRunner;
  }

  handleGetInput(name: string, required = false): string {
    if (required && !this.inputs[name]) {
      throw new Error(`Input ${name} is required.`);
    }
    return this.inputs[name];
  }

  handleGetDelimitedInput(name: string, delim: string | RegExp, required = false) {
    const input = this.handleGetInput(name, required);
    return input ? input.split(delim) : [];
  }

  handleGetVariable(name: string): string | undefined {
    return this.variables[name];
  }

  handleSetVariable(name: string, value: string): void {
    this.variables[name] = value;
  }

  handleTool(): ToolRunner {
    const lastToolRunner = {
      ...jest.requireActual("azure-pipelines-task-lib/toolrunner").ToolRunner,
      arg: jest.fn().mockReturnThis(),
      line: jest.fn().mockReturnThis(),
      execAsync: jest.fn().mockResolvedValue(0),
      on: jest.fn().mockImplementation(() => {}),
    };
    this.lastToolRunner = lastToolRunner;
    return lastToolRunner;
  }

  handleFindMatch() {
    return ["/path/to/mocked/find/match/result"];
  }

  handleSetResult(result: tl.TaskResult, message: string) {
    this.result = { result, message };
  }

  handleGetEndpointAuthorization() {
    return {
      scheme: "OAuth",
      parameters: {
        AccessToken: "mocked-access-token",
      },
    };
  }

  getResult() {
    return this.result;
  }

  reset() {
    this.inputs = { ...DEFAULT_INPUTS };
    this.variables = {};
    this.lastToolRunner = undefined;
    this.result = undefined;
  }
}
