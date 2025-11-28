import * as tl from "azure-pipelines-task-lib/task";
import { AzureTaskLibMock } from "../../mocks/AzureTaskLibMock";
import { EndpointType } from "../../sonarqube";
import { log, LogLevel, setEndpointType } from "../logging";

jest.mock("azure-pipelines-task-lib/task");

const azureTaskLibMock = new AzureTaskLibMock();

beforeEach(() => {
  jest.restoreAllMocks();
  azureTaskLibMock.reset();
});

describe("logging", () => {
  it("should log DEBUG messages", () => {
    log(LogLevel.DEBUG, "This is a debug message");
    expect(tl.debug).toHaveBeenCalledWith("[DEBUG] SonarQube Server: This is a debug message");
  });

  it("should log INFO messages", () => {
    jest.spyOn(console, "log");
    log(LogLevel.INFO, "This is an info message");
    expect(console.log).toHaveBeenCalledWith("[INFO]  SonarQube Server: This is an info message");
  });

  it("should log ERROR messages", () => {
    log(LogLevel.ERROR, "This is an error message");
    expect(tl.error).toHaveBeenCalledWith("[ERROR] SonarQube Server: This is an error message");
  });

  it("should log WARN messages", () => {
    log(LogLevel.WARN, "This is a warning message");
    expect(tl.warning).toHaveBeenCalledWith("[WARN]  SonarQube Server: This is a warning message");
  });

  it("should prefix with endpoint type", () => {
    jest.spyOn(console, "log");

    setEndpointType(EndpointType.Server);
    log(LogLevel.INFO, "This is an info message");
    expect(console.log).toHaveBeenLastCalledWith(
      "[INFO]  SonarQube Server: This is an info message",
    );

    setEndpointType(EndpointType.Cloud);
    log(LogLevel.INFO, "This is an info message");
    expect(console.log).toHaveBeenLastCalledWith(
      "[INFO]  SonarQube Cloud: This is an info message",
    );
  });
});
