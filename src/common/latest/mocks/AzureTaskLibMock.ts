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

  setInputs(inputs: { [key: string]: string }) {
    this.inputs = {
      ...this.inputs,
      ...inputs,
    };
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

  handleGetDelimitedInput(name: string, delim: string, required = false) {
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
    this.lastToolRunner = {
      ...jest.requireActual("azure-pipelines-task-lib/toolrunner").ToolRunner,
      arg: jest.fn().mockReturnThis(),
      line: jest.fn().mockReturnThis(),
      execAsync: jest.fn().mockResolvedValue(0),
      on: jest.fn().mockImplementation(() => {}),
    };
    return this.lastToolRunner;
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
