# PowerShell

$GIT_ROOT = git rev-parse --show-toplevel

Set-Location $GIT_ROOT; npm install

Set-Location "$GIT_ROOT\src\common\latest"; npm install
Set-Location "$GIT_ROOT\src\common\sonarqube-v4"; npm install

Set-Location $GIT_ROOT
