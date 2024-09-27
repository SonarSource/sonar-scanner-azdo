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
