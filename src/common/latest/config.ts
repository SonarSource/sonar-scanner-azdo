const msBuildVersion = "6.2.0.85879";
const cliVersion = "5.0.1.3006"; // Has to be the same version as the one embedded in the Scanner for MSBuild

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

  cliUrl: `${cliUrl}${getCliScannerFilename(cliVersion)}`,

  msBuildUrlTemplate: (msBuildVersion, isWindows) => {
    const filename = isWindows
      ? getMsBuildClassicFilename(msBuildVersion)
      : getMsBuildDotnetFilename(msBuildVersion);
    return `${scannersLocation}${msBuildVersion}/${filename}`;
  },

  cliUrlTemplate: (cliVersion) => `${cliUrl}${getCliScannerFilename(cliVersion)}`,

  classicUrl: `${scannersLocation}${msBuildVersion}/${getMsBuildClassicFilename(msBuildVersion)}`,

  dotnetUrl: `${scannersLocation}${msBuildVersion}/${getMsBuildDotnetFilename(msBuildVersion)}`,
};
