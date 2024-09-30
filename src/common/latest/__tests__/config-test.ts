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
