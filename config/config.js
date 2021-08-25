const msBuildVersion = "5.2.2.33595";
const cliVersion = "4.6.1.2450"; // Has to be the same version as the one embedded in the Scanner for MSBuild

const scannerUrlCommon =
  `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/` +
  `sonar-scanner-msbuild-${msBuildVersion}`;

exports.scanner = {
  msBuildVersion,
  cliVersion,
  classicUrl: `${scannerUrlCommon}-net46.zip`,
  dotnetUrl: `${scannerUrlCommon}-netcoreapp3.0.zip`,
};
