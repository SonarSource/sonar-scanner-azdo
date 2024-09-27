// When the user does not specify a specific version, these willl be the default versions used.
const dotnetScannerVersion = "6.2.0.85879";
const cliScannerVersion = "6.1.0.4477";

// MSBUILD scanner location
const dotnetScannersBaseUrl = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/`;

// CLI scanner location
const cliScannerBaseUrl = "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/";

function getMsBuildClassicFilename(dotnetScannerVersion: string) {
  return `sonar-scanner-${dotnetScannerVersion}-net-framework.zip`;
}

function getMsBuildDotnetFilename(dotnetScannerVersion: string) {
  return `sonar-scanner-${dotnetScannerVersion}-net.zip`;
}

function getCliScannerFilename(cliScannerVersion: string) {
  return `sonar-scanner-cli-${cliScannerVersion}.zip`;
}

function msBuildUrlTemplate(dotnetScannerVersion: string, framework: boolean) {
  const filename = framework
    ? getMsBuildClassicFilename(dotnetScannerVersion)
    : getMsBuildDotnetFilename(dotnetScannerVersion);
  return `${dotnetScannersBaseUrl}${dotnetScannerVersion}/${filename}`;
}

function cliUrlTemplate(cliScannerVersion: string) {
  return `${cliScannerBaseUrl}${getCliScannerFilename(cliScannerVersion)}`;
}

export const scanner = {
  dotnetScannerVersion,
  cliScannerVersion,
  classicUrl: msBuildUrlTemplate(dotnetScannerVersion, true),
  dotnetUrl: msBuildUrlTemplate(dotnetScannerVersion, false),
  cliUrl: cliUrlTemplate(cliScannerVersion),

  msBuildUrlTemplate,
  cliUrlTemplate,
};
