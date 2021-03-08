const msBuildVersion = "5.1.0.28487";
const cliVersion = "4.4.0.2170"; // Has to be the same version as the one embedded in the Scanner for MSBuild

const scannerUrlCommon =
  `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/` +
  `sonar-scanner-msbuild-${msBuildVersion}`;

exports.scanner = {
  msBuildVersion,
  cliVersion,
  classicUrl: `${scannerUrlCommon}-net46.zip`,
  dotnetUrl: `${scannerUrlCommon}-netcoreapp2.0.zip`,
};
