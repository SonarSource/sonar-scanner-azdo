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

/**
 * @typedef {Array<{
 *  extension: string,
 *  task: string,
 *  msBuildScanners?: boolean,
 *  cliScanner?: boolean
 * }>}
 */
exports.tasks = [
  {
    extension: "sonarqube",
    task: "prepare",
    msBuildScanners: true,
  },
  {
    extension: "sonarqube",
    task: "analyze",
    cliScanner: true,
  },
  {
    extension: "sonarqube",
    task: "publish",
  },
  {
    extension: "sonarcloud",
    task: "prepare",
    msBuildScanners: true,
  },
  {
    extension: "sonarcloud",
    task: "analyze",
    cliScanner: true,
  },
  {
    extension: "sonarcloud",
    task: "publish",
  },
];

exports.branches = [
  "feature/br/vsts-342-rewrite-build-process",
  "feature/br/vsts-342-rewrite-build-process-sq-4",
];
