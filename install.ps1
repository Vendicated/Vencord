# Vencord Windows Installer

$patcher = "$PWD\dist\patcher.js"
$patcher_safe = $patcher -replace '\\', '\\'

$APP_PATCH = @"
require("$patcher_safe");
require("../app.asar");
"@

$PACKAGE_JSON = @"
{
  "main": "index.js",
  "name": "discord"
}
"@

$discord_root = "$env:LOCALAPPDATA\Discord"

$app_folders = Get-ChildItem -Directory -Path $discord_root |
	Select-String -Pattern "app-"

foreach ($folder in $app_folders)
{
	$version = [regex]::match($folder, 'app-([\d\.]+)').Groups[1].Value
	Write-Output "Patching Version $version"

	$resources = "$folder\resources"
	if (-not(Test-Path -Path "$resources\app.asar")) {
		Write-Error "Failed to find app.asar in $folder`n"
		continue
	}

	$app = "$resources\app"
	if (Test-Path -Path $app) {
		Write-Error "Are you already patched? App folder already exists at $resources`n"
		continue
	}

	$null = New-Item -Path $app -ItemType Directory
	$null = Tee-Object -InputObject $APP_PATCH -FilePath "$app\index.js"
	$null = Tee-Object -InputObject $PACKAGE_JSON -FilePath "$app\package.json"

	Write-Output "Patched Discord (version $version) successfully"
}
