// When the user does not specify a specific version, these will be the default versions used.
const msBuildVersion = "6.2.0.85879";
const cliVersion = "6.2.1.4610";

// MSBUILD scanner location
const scannersLocation = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/`;
// CLI scanner location
const cliUrl = "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/";

function getMsBuildClassicFilename(msBuildVersion: string) {
  return `sonar-scanner-${msBuildVersion}-net-framework.zip`;
}

function getMsBuildDotnetFilename(msBuildVersion: string) {
  return `sonar-scanner-${msBuildVersion}-net.zip`;
}

function getCliScannerFilename(cliVersion: string) {
  return `sonar-scanner-cli-${cliVersion}.zip`;
}

function msBuildUrlTemplate(msBuildVersion: string, framework: boolean) {
  const filename = framework
    ? getMsBuildClassicFilename(msBuildVersion)
    : getMsBuildDotnetFilename(msBuildVersion);
  return `${scannersLocation}${msBuildVersion}/${filename}`;
}

function cliUrlTemplate(cliVersion: string) {
  return `${cliUrl}${getCliScannerFilename(cliVersion)}`;
}

export const scanner = {
  msBuildVersion,
  cliVersion,
  classicUrl: msBuildUrlTemplate(msBuildVersion, true),
  dotnetUrl: msBuildUrlTemplate(msBuildVersion, false),
  cliUrl: cliUrlTemplate(cliVersion),

  msBuildUrlTemplate,
  cliUrlTemplate,

  // Added for compatibility with the build process
  dotnetScannerVersion: msBuildVersion,
  cliScannerVersion: cliVersion,
};
