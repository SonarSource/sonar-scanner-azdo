const msBuildVersion = "5.14.0.78575";
const cliVersion = "4.8.1.3023"; // Has to be the same version as the one embedded in the Scanner for MSBuild

const scannerUrlCommon =
  `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/` +
  `sonar-scanner-msbuild-${msBuildVersion}`;

exports.scanner = {
  msBuildVersion,
  cliVersion,
  classicUrl: `${scannerUrlCommon}-net46.zip`,
  dotnetUrl: `${scannerUrlCommon}-netcoreapp3.0.zip`,
};
