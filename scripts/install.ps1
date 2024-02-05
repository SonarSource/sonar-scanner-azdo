# PowerShell

$GIT_ROOT = git rev-parse --show-toplevel

Set-Location $GIT_ROOT; npm install

Set-Location "$GIT_ROOT\src"; npm install

Set-Location "$GIT_ROOT\extensions\sonarqube\tasks\analyze"; npm install
Set-Location "$GIT_ROOT\extensions\sonarqube\tasks\prepare"; npm install
Set-Location "$GIT_ROOT\extensions\sonarqube\tasks\publish"; npm install

Set-Location "$GIT_ROOT\extensions\sonarcloud\tasks\prepare"; npm install
Set-Location "$GIT_ROOT\extensions\sonarcloud\tasks\analyze"; npm install
Set-Location "$GIT_ROOT\extensions\sonarcloud\tasks\publish"; npm install

Set-Location $GIT_ROOT
