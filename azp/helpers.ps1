function Get-ExtensionVersion(
    [Parameter(Mandatory = $true, Position = 0)][string]$manifestPath,
    [Parameter(Mandatory = $true, Position = 1)][string]$product)   {

    Write-Host "Reading the ${product} extension version from '${manifestPath}' ..."

    $extensionManifestContent = Get-Content "$manifestPath" | ConvertFrom-Json
    $version = $extensionManifestContent.version
    Write-Host "${product} extension version is '${version}'"
    # Set the variable to it can be used by other tasks
    
    return $version
}
