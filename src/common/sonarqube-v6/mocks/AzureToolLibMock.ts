import * as toolLib from "azure-pipelines-tool-lib/tool";

jest.mock("azure-pipelines-tool-lib/tool");

export class AzureToolLibMock {
  constructor() {
    jest.mocked(toolLib.downloadTool).mockImplementation(this.handleDownloadTool.bind(this));
    jest.mocked(toolLib.extractZip).mockImplementation(this.handleExtractZip.bind(this));
  }

  handleDownloadTool(): Promise<string> {
    return Promise.resolve("/some-path/to/tool");
  }

  handleExtractZip(): Promise<string> {
    return Promise.resolve("/some-path/to/extracted");
  }

  reset() {
    jest.mocked(toolLib.downloadTool).mockClear();
    jest.mocked(toolLib.extractZip).mockClear();
  }
}
