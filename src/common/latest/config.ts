// Default Scanner versions are defined as `msBuildVersion` and `cliVersion` in
// [sonarcloud](../../extensions/sonarcloud/tasks/SonarCloudPrepare/v2/task.json)
// [sonarqube](../../extensions/sonarqube/tasks/SonarQubePrepare/v6/task.json)

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
  msBuildUrlTemplate: (msBuildVersion: string, isWindows: boolean) => {
    const filename = isWindows
      ? getMsBuildClassicFilename(msBuildVersion)
      : getMsBuildDotnetFilename(msBuildVersion);
    return `${scannersLocation}${msBuildVersion}/${filename}`;
  },

  cliUrlTemplate: (cliVersion: string) => `${cliUrl}${getCliScannerFilename(cliVersion)}`,
};
