const msBuildVersion = "5.15.0.80890";
const cliVersion = "4.8.1.3023"; // Has to be the same version as the one embedded in the Scanner for MSBuild

const scannersLocation = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/`;
const classicScannerFilename = `sonar-scanner-msbuild-${msBuildVersion}-net46.zip`;
const dotnetScannerFilename = `sonar-scanner-msbuild-${msBuildVersion}-netcoreapp3.0.zip`;

exports.scanner = {
  msBuildVersion,
  cliVersion,
  classicUrl: scannersLocation + classicScannerFilename,
  dotnetUrl: scannersLocation + dotnetScannerFilename,
};
