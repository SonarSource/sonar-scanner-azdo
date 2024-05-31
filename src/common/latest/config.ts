// When the user does not specify a specific version, these willl be the default versions used.
const msBuildVersion = "6.2.0.85879";
const cliVersion = "5.0.1.3006";

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

export const scanner = {
  msBuildVersion,
  cliVersion,

  msBuildUrlTemplate: (msBuildVersion: string, isWindows: boolean) => {
    const filename = isWindows
      ? getMsBuildClassicFilename(msBuildVersion)
      : getMsBuildDotnetFilename(msBuildVersion);
    return `${scannersLocation}${msBuildVersion}/${filename}`;
  },

  cliUrlTemplate: (cliVersion: string) => `${cliUrl}${getCliScannerFilename(cliVersion)}`,
};
