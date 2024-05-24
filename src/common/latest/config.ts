const msBuildVersion = "6.2.0.85879";
const cliVersion = "5.0.1.3006"; // Has to be the same version as the one embedded in the Scanner for MSBuild

// MSBUILD scanner location
const scannersLocation = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/`;
const classicScannerFilename = `sonar-scanner-${msBuildVersion}-net-framework.zip`;
const dotnetScannerFilename = `sonar-scanner-${msBuildVersion}-net.zip`;

const cliUrl = "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/";

export const scanner = {
  msBuildVersion,
  cliVersion,
  cliUrl: cliUrl + `sonar-scanner-cli-${cliVersion}.zip`,
  classicUrl: scannersLocation + classicScannerFilename,
  dotnetUrl: scannersLocation + dotnetScannerFilename,
};
