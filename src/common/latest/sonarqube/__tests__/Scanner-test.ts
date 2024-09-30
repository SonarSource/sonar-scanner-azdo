import * as tl from "azure-pipelines-task-lib/task";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { TaskVariables } from "../../helpers/constants";
import { AzureTaskLibMock } from "../../mocks/AzureTaskLibMock";
import { AzureToolLibMock } from "../../mocks/AzureToolLibMock";
import Scanner, { ScannerCLI, ScannerDotnet, ScannerMode } from "../Scanner";

jest.mock("fs-extra", () => ({
  ...jest.requireActual("fs-extra"),
  chmod: jest.fn(),
}));

jest.mock("azure-pipelines-task-lib/task");
jest.mock("azure-pipelines-tool-lib/tool");

const azureTaskLibMock = new AzureTaskLibMock();
const azureToolLibMock = new AzureToolLibMock();

beforeEach(() => {
  jest.clearAllMocks();
  azureTaskLibMock.reset();
  azureToolLibMock.reset();
});

const MOCK_ROOT_PATH = "/path/to/project";

afterAll(() => {
  jest.restoreAllMocks();
});

describe("Scanner", () => {
  describe("ScannerCLI", () => {
    describe("instantiation", () => {
      it("should be instantiated properly in file config mode", () => {
        azureTaskLibMock.setInputs({
          configMode: "file",
          configFile: "/path/to/sonar-project.properties",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.cli);
        expect(scanner).toBeInstanceOf(ScannerCLI);
        expect(scanner.toSonarProps()).toEqual({
          "project.settings": "/path/to/sonar-project.properties",
        });
      });

      it.each(["manual", undefined])(
        "should be instantiated properly in %s config mode",
        (configMode) => {
          azureTaskLibMock.setInputs({
            configMode,
            cliProjectKey: "projectKey",
            cliProjectName: "projectName",
            cliProjectVersion: "projectVersion",
            cliSources: ".",
          });

          const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.cli);
          expect(scanner).toBeInstanceOf(ScannerCLI);
          expect(scanner.toSonarProps()).toEqual({
            "sonar.projectKey": "projectKey",
            "sonar.projectName": "projectName",
            "sonar.projectVersion": "projectVersion",
            "sonar.sources": ".",
          });
        },
      );
    });

    describe("prepare", () => {
      it("should download scanner when needed (windows)", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Windows);
        azureTaskLibMock.setInputs({
          cliScannerVersion: "1.22.333",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.cli);
        await scanner.runPrepare();

        expect(toolLib.downloadTool).toHaveBeenCalledWith(
          "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-1.22.333.zip",
        );
        expect(tl.setVariable).toHaveBeenLastCalledWith(
          TaskVariables.SonarScannerLocation,
          "/some-path/to/cached/sonar-scanner-1.22.333/bin/sonar-scanner.bat",
        );
      });

      it("should download scanner when needed (unix)", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setInputs({
          cliScannerVersion: "1.22.333",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.cli);
        await scanner.runPrepare();

        expect(toolLib.downloadTool).toHaveBeenCalledWith(
          "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-1.22.333.zip",
        );

        expect(tl.setVariable).toHaveBeenLastCalledWith(
          TaskVariables.SonarScannerLocation,
          "/some-path/to/cached/sonar-scanner-1.22.333/bin/sonar-scanner",
        );
      });

      it("should not download scanner when not overridden by user", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.cli);
        await scanner.runPrepare();
        expect(tl.setVariable).toHaveBeenLastCalledWith(TaskVariables.SonarScannerLocation, "");
      });

      it("should not download scanner when found in the cache", async () => {
        azureToolLibMock.setLocalToolPath("SonarScanner CLI", "/some-path/to/cached");
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setInputs({
          cliScannerVersion: "1.22.333",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.cli);
        await scanner.runPrepare();

        expect(toolLib.downloadTool).not.toHaveBeenCalled();

        expect(tl.setVariable).toHaveBeenLastCalledWith(
          TaskVariables.SonarScannerLocation,
          "/some-path/to/cached/sonar-scanner-1.22.333/bin/sonar-scanner",
        );
      });
    });

    describe("analyze", () => {
      it("should run downloaded scanner", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Windows);
        azureTaskLibMock.setVariables({
          [TaskVariables.SonarScannerLocation]: "/path/to/temp/directory/bin/sonar-scanner.bat",
          [TaskVariables.SonarScannerMode]: ScannerMode.cli,
        });

        const scanner = new ScannerCLI(MOCK_ROOT_PATH, {});
        await scanner.runAnalysis();

        expect(tl.tool).toHaveBeenCalledWith("/path/to/temp/directory/bin/sonar-scanner.bat");
      });

      it("should run embedded scanner", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);

        const scanner = new ScannerCLI(MOCK_ROOT_PATH, {});
        await scanner.runAnalysis();

        expect(tl.tool).toHaveBeenCalledWith(MOCK_ROOT_PATH + "/sonar-scanner/bin/sonar-scanner");
        const tool = azureTaskLibMock.getLastToolRunner();
        expect(tool).toBeDefined();
        expect(tool!.execAsync).toHaveBeenCalled();
        expect(tool!.arg).not.toHaveBeenCalledWith("-X");
      });

      it("should run with debug mode", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setVariables({
          "system.debug": "true",
        });

        const scanner = new ScannerCLI(MOCK_ROOT_PATH, {});
        await scanner.runAnalysis();

        const tool = azureTaskLibMock.getLastToolRunner();
        expect(tool).toBeDefined();
        expect(tool!.execAsync).toHaveBeenCalled();
        expect(tool!.arg).toHaveBeenCalledWith("-X");
      });
    });
  });

  describe("ScannerDotnet", () => {
    describe("instantiation", () => {
      it("should be instantiated properly", () => {
        azureTaskLibMock.setInputs({
          projectKey: "projectKey",
          projectName: "projectName",
          projectVersion: "projectVersion",
        });
        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        expect(scanner).toBeInstanceOf(ScannerDotnet);

        expect(scanner.toSonarProps()).toEqual({
          "sonar.projectKey": "projectKey",
          "sonar.projectName": "projectName",
          "sonar.projectVersion": "projectVersion",
        });
      });
    });

    describe("prepare", () => {
      it("fail with verbosity on old 'MSBuild' usage", () => {
        expect(() => Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.msbuild)).toThrow(
          `Use 'scannerMode: dotnet' instead of 'scannerMode: MSBuild' in your task configuration.`,
        );
      });

      it("should use downloaded scanner on windows", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Windows);
        azureTaskLibMock.setInputs({
          dotnetScannerVersion: "1.22.333",
          projectKey: "projectKey",
          projectName: "projectName",
        });
        azureTaskLibMock.setVariables({
          [TaskVariables.SonarScannerMode]: ScannerMode.dotnet,
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runPrepare();

        expect(toolLib.downloadTool).toHaveBeenCalledWith(
          "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/1.22.333/sonar-scanner-1.22.333-net-framework.zip",
        );

        expect(tl.tool).toHaveBeenCalledWith("/some-path/to/cached/SonarScanner.MSBuild.exe");
        const toolRunner = azureTaskLibMock.getLastToolRunner();
        expect(toolRunner).toBeDefined();
        expect(toolRunner!.arg).toHaveBeenCalledWith("begin");
        expect(toolRunner!.arg).toHaveBeenCalledWith("/k:projectKey");
      });

      it("should use downloaded scanner on unix", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setInputs({
          dotnetScannerVersion: "1.22.333",
          projectKey: "projectKey",
          projectName: "projectName",
          organization: "my-org",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runPrepare();

        expect(toolLib.downloadTool).toHaveBeenCalledWith(
          "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/1.22.333/sonar-scanner-1.22.333-net.zip",
        );

        expect(tl.tool).toHaveBeenCalledWith("/bin/dotnet");
        const toolRunner = azureTaskLibMock.getLastToolRunner();
        expect(toolRunner).toBeDefined();
        expect(toolRunner!.arg).toHaveBeenCalledWith(
          "/some-path/to/cached/SonarScanner.MSBuild.dll",
        );
        expect(toolRunner!.arg).toHaveBeenCalledWith("begin");
        expect(toolRunner!.arg).toHaveBeenCalledWith("/k:projectKey");
        expect(toolRunner!.arg).toHaveBeenCalledWith("/o:my-org");
      });

      it("should not download scanner when found in the cache", async () => {
        azureToolLibMock.setLocalToolPath("SonarScanner .NET", "/some-path/to/cached");
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setInputs({
          msBuildVersion: "1.22.333",
          projectKey: "projectKey",
          projectName: "projectName",
          organization: "my-org",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runPrepare();

        expect(toolLib.downloadTool).not.toHaveBeenCalled();

        expect(tl.tool).toHaveBeenCalledWith("/bin/dotnet");
        const toolRunner = azureTaskLibMock.getLastToolRunner();
        expect(toolRunner).toBeDefined();
        expect(toolRunner!.arg).toHaveBeenCalledWith(
          "/path/to/project/dotnet-sonar-scanner-msbuild/SonarScanner.MSBuild.dll",
        );
        expect(toolRunner!.arg).toHaveBeenCalledWith("begin");
        expect(toolRunner!.arg).toHaveBeenCalledWith("/k:projectKey");
        expect(toolRunner!.arg).toHaveBeenCalledWith("/o:my-org");
      });

      it("should use the embedded framework scanner when not overriden by user", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Windows);
        azureTaskLibMock.setInputs({
          projectKey: "projectKey",
          projectName: "projectName",
        });
        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runPrepare();

        expect(tl.tool).toHaveBeenCalledWith(
          MOCK_ROOT_PATH + "/classic-sonar-scanner-msbuild/SonarScanner.MSBuild.exe",
        );
      });

      it("should use the embedded dotnet scanner when not overriden by user", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setInputs({
          projectKey: "projectKey",
          projectName: "projectName",
        });
        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runPrepare();

        expect(tl.tool).toHaveBeenCalledWith("/bin/dotnet");
        const toolRunner = azureTaskLibMock.getLastToolRunner();
        expect(toolRunner).toBeDefined();
        expect(toolRunner!.arg).toHaveBeenCalledWith(
          MOCK_ROOT_PATH + "/dotnet-sonar-scanner-msbuild/SonarScanner.MSBuild.dll",
        );
      });
    });

    describe("analyze", () => {
      it("should run framework scanner", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Windows);
        azureTaskLibMock.setInputs({
          projectKey: "projectKey",
          projectName: "projectName",
        });
        azureTaskLibMock.setVariables({
          [TaskVariables.SonarScannerDotnetExe]: "/some-path/to/cached/SonarScanner.MSBuild.exe",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runAnalysis();

        expect(tl.tool).toHaveBeenCalledWith("/some-path/to/cached/SonarScanner.MSBuild.exe");
        const toolRunner = azureTaskLibMock.getLastToolRunner();
        expect(toolRunner).toBeDefined();
        expect(toolRunner!.arg).toHaveBeenCalledWith("end");
      });

      it("should run dotnet scanner", async () => {
        azureTaskLibMock.setPlatform(tl.Platform.Linux);
        azureTaskLibMock.setInputs({
          projectKey: "projectKey",
          projectName: "projectName",
        });
        azureTaskLibMock.setVariables({
          [TaskVariables.SonarScannerDotnetDll]: "/some-path/to/cached/SonarScanner.MSBuild.dll",
        });

        const scanner = Scanner.getPrepareScanner(MOCK_ROOT_PATH, ScannerMode.dotnet);
        await scanner.runAnalysis();

        expect(tl.tool).toHaveBeenCalledWith("/bin/dotnet");
        const toolRunner = azureTaskLibMock.getLastToolRunner();
        expect(toolRunner).toBeDefined();
        expect(toolRunner!.arg).toHaveBeenCalledWith(
          "/some-path/to/cached/SonarScanner.MSBuild.dll",
        );
        expect(toolRunner!.arg).toHaveBeenCalledWith("end");
      });
    });
  });
});
