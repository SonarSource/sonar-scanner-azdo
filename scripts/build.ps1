Set-StrictMode -version 2.0
$ErrorActionPreference = "Stop"

function Clear-BuildOutputFolder() {
    Write-Header "Cleaning output directories"
    if (Test-Path("$fullBuildOutputDir")) {
        Remove-Item "$fullBuildOutputDir\*" -Recurse -Force
    }
    Write-Host "Directories cleaned."
}

function Get-ScannerCli() {
    Write-Header "Downloading vanilla Scanner CLI"
    $artifactoryUrlEnv = "ARTIFACTORY_URL"
    
    $artifactoryUrl = [environment]::GetEnvironmentVariable($artifactoryUrlEnv, "Process")
    if (!$artifactoryUrl) {
        Write-Host "Could not find ARTIFACTORY_URL variable, defaulting to repox URL.";
        $artifactoryUrl = "https://repox.jfrog.io/repox";
    }

    $scannerCliUrl = $artifactoryUrl + "/sonarsource-public-releases/org/sonarsource/scanner/cli/sonar-scanner-cli/$scannerCliVersion/$scannerCliArtifact";

    if (!(Test-Path -LiteralPath $scannersDownloadDir)) {
        Write-Host "Directory not found, creating it...";
        New-Item -Path $scannersDownloadDir -ItemType Directory -ErrorAction Stop -Force
        Write-Host "Directory created.";
    }

    if (!(Test-Path -LiteralPath $scannersDownloadDir\$scannerCliArtifact)) {
        Write-Host "Scanner CLI not found, downloading it...";
        Invoke-WebRequest -Uri $scannerCliUrl -OutFile $scannersDownloadDir\$scannerCliArtifact
        Write-Host "Scanner CLI downloaded at $scannersDownloadDir\$scannerCliArtifact...";
    }
}

function Get-ScannerMsBuild() {
    Write-Header "Downloading SonarScanner for .NET"
    if (!(Test-Path -LiteralPath $scannersDownloadDir\$scannerMsBuildNetFwkArtifactName)) {
        Write-Host "Downloading $scannerMsBuildNetFwkArtifactName...";
        Invoke-WebRequest -Uri $scannerMsBuildNetFwkUrl -OutFile $scannersDownloadDir\$scannerMsBuildNetFwkArtifactName
    }

    if (!(Test-Path -LiteralPath $scannersDownloadDir\$scannerMsBuildNetCoreArtifactName)) {
        Write-Host "Downloading $scannerMsBuildNetCoreArtifactName...";
        Invoke-WebRequest -Uri $scannerMsBuildNetCoreUrl -OutFile $scannersDownloadDir\$scannerMsBuildNetCoreArtifactName
    }
}

function Invoke-NpmInstall() {
    $current_dir = Get-Location

    Write-Header "NPM package installations"

    foreach ($packagePath in $pathsToPackages) {
        Set-Location -path $packagePath

        $packageJson = Get-Content ${packagePath}/package.json | Out-String | ConvertFrom-Json

        $hasDevDependencies = [bool]($packageJson.PSobject.Properties.name -match "devDependencies")

        if ($hasDevDependencies) {
            if ($packageJson.devDependencies.length -gt 0) {
                throw "'Task package.json should not contain dev dependencies. Offending package.json: $packageJson."
            }
        }

        npm install
    }

    Set-Location -path $current_dir
}

function Write-Header([string]$text) {
    Write-Host
    Write-Host "================================================"
    Write-Host $text
    Write-Host "================================================"
}

function Build-SonarCloud() {



}

$current_dir = Get-Location
try {
    # . (Join-Path $PSScriptRoot "build-utils.ps1")
    # . (Join-Path $PSScriptRoot "package-artifacts.ps1")
    . (Join-Path $PSScriptRoot "variables.ps1")

    Clear-BuildOutputFolder
    Get-ScannerCli
    Get-ScannerMsBuild

    Invoke-NpmInstall
    
    Write-Host -ForegroundColor Green "SUCCESS: CI job was successful!"
    exit 0
}
catch {
    Set-Location -path $current_dir
    Write-Host -ForegroundColor Red $_
    Write-Host $_.Exception
    Write-Host $_.ScriptStackTrace
    exit 1
}