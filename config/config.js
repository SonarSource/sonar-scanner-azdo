const msBuildVersion = '4.0.2.892';
const cliVersion = '3.0.3.778'; // Has to be the same version as the one embedded in the Scanner for MSBuild
exports.scanner = {
  msBuildVersion,
  cliVersion,
  url: `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/sonar-scanner-msbuild-${msBuildVersion}.zip`
};
