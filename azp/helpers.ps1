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
