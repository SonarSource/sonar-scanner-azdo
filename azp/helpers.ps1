function Get-ExtensionVersion(
    [Parameter(Mandatory = $true, Position = 0)][string]$manifestPath) {
    
    $extensionManifestContent = Get-Content "$manifestPath" | ConvertFrom-Json
    $version = $extensionManifestContent.version
    return $version
}

function Format-Version(
    [Parameter(Mandatory = $true, Position = 0)][string]$version) {
    if (-Not [string]::IsNullOrEmpty($env:BUILD_BUILDID)) {
        $version = "$version.$env:BUILD_BUILDID"
    }
    return $version
}

function Replace-Version([Parameter(Mandatory = $true, Position = 0)][string]$manifestPath){

    $manifestContent = Get-Content $manifestPath
    $extensionManifestContent = Get-Content "$manifestPath" | ConvertFrom-Json
    $version = $extensionManifestContent.version
    
    $formattedVersion = Format-Version $version

    Write-Host "Replacing version ${version} in ${manifestPath} by ${formattedVersion}"

    $manifestContent = $manifestContent.Replace($version, $formattedVersion)

    Set-Content -Path $manifestPath -Value $manifestContent

    return $formattedVersion
}

function Get-AzureDevopsTaskVersion(
    [Parameter(Mandatory = $true, Position = 0)][string]$basePath,
    [Parameter(Mandatory = $true, Position = 1)][string]$product,
    [Parameter(Mandatory = $true, Position = 2)][string]$task,
    [Parameter(Mandatory = $true, Position = 3)][string]$version) {
    $extPath = Join-Path -Path $basePath -ChildPath $product -AdditionalChildPath "tasks"

    $manifestFileName = "task.json"

    $taskVersionPath = Join-Path -Path $extPath -ChildPath $task -AdditionalChildPath $version

    $version = Get-TaskVersion(Join-Path -Path $taskVersionPath $manifestFileName) 

    return $version
}

function Get-TaskVersion([Parameter(Mandatory = $true, Position = 0)][string]$filePath) {
    $fileContent = Get-Content "$filePath" | ConvertFrom-Json

    $major = $fileContent.version.Major
    $minor = $fileContent.version.Minor
    $patch = $fileContent.version.Patch

    return "$major.$minor.$patch"
}