import * as tl from "azure-pipelines-task-lib/task";
import { ScannerCLI, ScannerMSBuild } from "../Scanner";
import { TaskVariables } from "../../helpers/constants";

const MOCK_ROOT_PATH = "/path/to/project";
const MOCK_CLI_VERSION = "1.33.7";
const MOCK_MSBUILD_VERSION = "1.1.1";
const MOCK_DOTNET_PATH = "/path/to/dotnet";
const MOCKTOOLRUNNER = {
  ...jest.requireActual("azure-pipelines-task-lib/toolrunner").ToolRunner,
  arg: jest.fn().mockReturnThis(),
  line: jest.fn().mockReturnThis(),
  execAsync: jest.fn().mockResolvedValue(0),
  on: jest.fn().mockImplementation(() => {}),
};

jest.mock("fs", () => ({
  ...jest.requireActual("fs"), // This will keep the original implementations of other fs methods
  chmod: jest.fn(), // This will replace chmod with a mock function
}));

afterAll(() => {
  jest.restoreAllMocks();
});

describe("Scanner", () => {
  beforeEach(() => {
    jest.spyOn(tl, "resolve").mockImplementation((...paths) => paths.join("/"));
  });
  describe("ScannerCLI", () => {
    it("should reference the downloaded scanner location for windows", () => {
      jest.spyOn(tl, "getPlatform").mockReturnValue(tl.Platform.Windows);
      jest.spyOn(tl, "tool").mockImplementation(() => MOCKTOOLRUNNER);
      jest.spyOn(tl, "getVariable").mockImplementation((variable) => {
        if (variable === TaskVariables.SonarScannerLocation) {
          return "/path/to/temp/directory";
        } else if (variable === TaskVariables.SonarCliVersion) {
          return MOCK_CLI_VERSION;
        } else if (TaskVariables.SonarScannerMode) {
          return "CLI";
        } else return undefined;
      });

      const scanner = new ScannerCLI(MOCK_ROOT_PATH, {});

      scanner.runAnalysis();

      expect(tl.resolve).toHaveBeenCalledWith(
        "/path/to/temp/directory",
        "sonar-scanner-1.33.7",
        "bin",
        "sonar-scanner",
      );
      expect(tl.tool).toHaveBeenCalledWith(
        "/path/to/temp/directory/sonar-scanner-1.33.7/bin/sonar-scanner.bat",
      );
    });
  });

  describe("ScannerMSBuild", () => {
    beforeEach(() => {
      jest.spyOn(tl, "tool").mockImplementation(() => MOCKTOOLRUNNER);
      jest.spyOn(tl, "getVariable").mockImplementation((variable) => {
        if (variable === TaskVariables.SonarScannerLocation) {
          return "/path/to/temp/directory";
        } else if (variable === TaskVariables.SonarMsBuildVersion) {
          return MOCK_MSBUILD_VERSION;
        } else if (TaskVariables.SonarScannerMode) {
          return "MSBuild";
        } else return undefined;
      });
    });
    it("should reference the downloaded scanner location for windows", () => {
      jest.spyOn(tl, "getPlatform").mockReturnValue(tl.Platform.Windows);
      jest.spyOn(tl, "which").mockReturnValue(MOCK_DOTNET_PATH);
      jest.spyOn(tl, "findMatch").mockImplementation((...paths) => {
        const [scannerExecutablePath, fullPath] = paths;
        expect(scannerExecutablePath).toBe("/path/to/temp/directory/SonarScanner.MSBuild.exe");
        expect(fullPath).toBe("/path/to/temp/directory/sonar-scanner-*/bin/sonar-scanner");

        return ["/path/to/temp/directory/sonar-scanner-1.33.7/bin/sonar-scanner"];
      });

      const scanner = new ScannerMSBuild(MOCK_ROOT_PATH, {});

      scanner.runPrepare();

      expect(tl.tool).toHaveBeenCalledWith("/path/to/temp/directory/SonarScanner.MSBuild.exe");
    });

    it("should reference the downloaded scanner location for unix", () => {
      jest.spyOn(tl, "getPlatform").mockReturnValue(tl.Platform.Linux);
      jest.spyOn(tl, "resolve").mockImplementation((...paths) => paths.join("/"));
      jest.spyOn(tl, "tool").mockImplementation(() => MOCKTOOLRUNNER);
      jest.spyOn(tl, "which").mockReturnValue(MOCK_DOTNET_PATH);

      jest.spyOn(tl, "findMatch").mockImplementation((...paths) => {
        const [scannerExecutablePath, fullPath] = paths;
        expect(scannerExecutablePath).toBe("/path/to/temp/directory/SonarScanner.MSBuild.dll");
        expect(fullPath).toBe("/path/to/temp/directory/sonar-scanner-*/bin/sonar-scanner");

        return ["/path/to/temp/directory/sonar-scanner-1.33.7/bin/sonar-scanner"];
      });
      jest.spyOn(tl, "getVariable").mockImplementation((variable) => {
        if (variable === TaskVariables.SonarScannerLocation) {
          return "/path/to/temp/directory";
        } else if (variable === TaskVariables.SonarMsBuildVersion) {
          return MOCK_MSBUILD_VERSION;
        } else if (TaskVariables.SonarScannerMode) {
          return "MSBuild";
        } else return undefined;
      });

      const scanner = new ScannerMSBuild(MOCK_ROOT_PATH, {});

      scanner.runPrepare();

      expect(tl.tool).toHaveBeenCalledWith(MOCK_DOTNET_PATH);
      expect(MOCKTOOLRUNNER.arg).toHaveBeenCalledWith(
        "/path/to/temp/directory/SonarScanner.MSBuild.dll",
      );
    });
  });
});
