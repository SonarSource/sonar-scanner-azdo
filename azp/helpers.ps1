function Get-ExtensionVersion(
    [Parameter(Mandatory = $true, Position = 0)][string]$manifestPath,
    [Parameter(Mandatory = $true, Position = 1)][string]$product) {

    Write-Host "Reading the ${product} extension version from '${manifestPath}' ..."

    $extensionManifestContent = Get-Content "$manifestPath" | ConvertFrom-Json
    $version = $extensionManifestContent.version
    Write-Host "${product} extension version is '${version}'"
    # Set the variable to it can be used by other tasks
    
    return $version
}

function Format-SnapshotVersion(
    [Parameter(Mandatory = $true, Position = 0)][string]$version) {
    if ($version -contains "-SNAPSHOT" && -Not [string]::IsNullOrEmpty($env:BUILD_BUILDID)) {
        Write-Host 'condition met'
        $version = $version.replace("-SNAPSHOT", ".$env:BUILD_BUILDID")
    }
    return $version
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