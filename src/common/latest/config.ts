// When the user does not specify a specific version, these willl be the default versions used.
const dotnetScannerVersion = "10.1.1.111189";
const cliScannerVersion = "6.2.1.4610";

// MSBUILD scanner location
const dotnetScannersBaseUrl = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/`;

// CLI scanner location
const cliScannerBaseUrl = "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/";

function getDotnetFrameworkFilename(dotnetScannerVersion: string) {
  return `sonar-scanner-${dotnetScannerVersion}-net-framework.zip`;
}

function getDotnetetCoreFilename(dotnetScannerVersion: string) {
  return `sonar-scanner-${dotnetScannerVersion}-net.zip`;
}

function getCliScannerFilename(cliScannerVersion: string) {
  return `sonar-scanner-cli-${cliScannerVersion}.zip`;
}

function dotnetScannerUrlTemplate(dotnetScannerVersion: string, framework: boolean) {
  const filename = framework
    ? getDotnetFrameworkFilename(dotnetScannerVersion)
    : getDotnetetCoreFilename(dotnetScannerVersion);
  return `${dotnetScannersBaseUrl}${dotnetScannerVersion}/${filename}`;
}

function cliUrlTemplate(cliScannerVersion: string) {
  return `${cliScannerBaseUrl}${getCliScannerFilename(cliScannerVersion)}`;
}

export const scanner = {
  dotnetScannerVersion,
  cliScannerVersion,
  classicUrl: dotnetScannerUrlTemplate(dotnetScannerVersion, true),
  dotnetUrl: dotnetScannerUrlTemplate(dotnetScannerVersion, false),
  cliUrl: cliUrlTemplate(cliScannerVersion),

  dotnetScannerUrlTemplate,
  cliUrlTemplate,
};
