const msBuildVersion = '4.0.2.892';
const cliVersion = '3.0.3.778'; // Has to be the same version as the one embedded in the Scanner for MSBuild

// const scannerUrlCommon = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${msBuildVersion}/sonar-scanner-msbuild-${msBuildVersion}`
// classicUrl: `${scannerUrlCommon}-net46.zip`,
// dotnetUrl:  `${scannerUrlCommon}-netcoreapp2.0.zip`

// `https://repox.sonarsource.com/sonarsource/org/sonarsource/scanner/msbuild/sonar-scanner-msbuild/4.1.0.1103/sonar-scanner-msbuild-4.1.0.1103-net46.zip`,
// `https://repox.sonarsource.com/sonarsource/org/sonarsource/scanner/msbuild/sonar-scanner-msbuild/4.1.0.1103/sonar-scanner-msbuild-4.1.0.1103-netcoreapp2.0.zip`

exports.scanner = {
  msBuildVersion,
  cliVersion,

  //TODO: use values from lines 4-6 instead!

  //classicUrl: `http://michal-barczyk/sonarqube-scanner-msbuild-net46.zip`,
  //dotnetUrl:  `http://michal-barczyk/sonarqube-scanner-msbuild-netcoreapp2.0.zip`

  classicUrl: `https://repox.sonarsource.com/sonarsource/org/sonarsource/scanner/msbuild/sonar-scanner-msbuild/4.1.0.1103/sonar-scanner-msbuild-4.1.0.1103-net46.zip`,
  dotnetUrl:  `https://repox.sonarsource.com/sonarsource/org/sonarsource/scanner/msbuild/sonar-scanner-msbuild/4.1.0.1103/sonar-scanner-msbuild-4.1.0.1103-netcoreapp2.0.zip`
};
