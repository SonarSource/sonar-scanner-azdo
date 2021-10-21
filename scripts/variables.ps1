$rootDir = "$PSScriptRoot\..\"
$fullBuildOutputDir = "$rootDir\build_powershell" 
$scannerMsBuildVersion = "5.3.1.36242"
$scannerMsBuildBaseUrl = "https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${scannerMsBuildVersion}/"
$scannerMsBuildNetFwkArtifactName = "sonar-scanner-msbuild-$scannerMsBuildVersion-net46.zip"
$scannerMsBuildNetCoreArtifactName = "sonar-scanner-msbuild-$scannerMsBuildVersion-netcoreapp3.0.zip"
$scannerMsBuildNetFwkUrl = "${scannerMsBuildBaseUrl}${scannerMsBuildNetFwkArtifactName}"
$scannerMsBuildNetCoreUrl = "${scannerMsBuildBaseUrl}${scannerMsBuildNetCoreArtifactName}"
$scannerCliVersion = "4.6.2.2472"
$scannerCliAssemblyName = "sonar-scanner-cli-$ScannerCliVersion"
$scannerCliArtifact = "$scannerCliAssemblyName.zip"
$scannersDownloadDir = "$fullBuildOutputDir\temp"
$pathsToPackages=@("$rootDir/common/ts", 
                    "$rootDir/commonv5/ts", 
                    "$rootDir/extensions/sonarcloud/tasks/analyze/new", 
                    "$rootDir/extensions/sonarcloud/tasks/prepare/new",
                    "$rootDir/extensions/sonarcloud/tasks/publish/new",
                    "$rootDir/extensions/sonarqube/tasks/analyze/v4",
                    "$rootDir/extensions/sonarqube/tasks/analyze/v5",
                    "$rootDir/extensions/sonarqube/tasks/prepare/v4",
                    "$rootDir/extensions/sonarqube/tasks/prepare/v5",
                    "$rootDir/extensions/sonarqube/tasks/publish/v4",
                    "$rootDir/extensions/sonarqube/tasks/publish/v5" )
