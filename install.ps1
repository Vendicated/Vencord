# Vencord Windows Installer

$patcher = "$PWD\dist\patcher.js"
$patcher_safe = $patcher -replace '\\', '/'

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

$branch_paths = Get-ChildItem -Directory -Path $env:LOCALAPPDATA |
	Select-String -Pattern "Discord\w*" -AllMatches |
	Select-String -Pattern "DiscordGames" -NotMatch # Ignore DiscordGames folder

$branches = @()

foreach ($branch in $branch_paths) {
	$branch = $branch.Line.Split("\")[-1]

	if ($branch -eq "Discord") {
		$branch = "Discord Stable"
	} else {
		$branch = $branch.Replace("Discord", "Discord ")
	}

	$branches = $branches + $branch
}

$branch_count = $branches.Count

Write-Output "Found $branch_count Branches"
Write-Output "====================================="
Write-Output "===== Select a Branch to patch ======"

$i = 0
foreach ($branch in $branches) {
	Write-Output "=== $i. $branch"
	$i++
}

Write-Output "====================================="
$pos = Read-Host "Enter a number"

if ($null -eq $branches[$pos]) {
	Write-Output "Invalid branch selection"
	exit
}

$branch = $branches.Get($pos)
$discord_root = $branch_paths.Get($pos)

Write-Output "`nPatching $branch"

$app_folders = Get-ChildItem -Directory -Path $discord_root |
	Select-String -Pattern "app-"

foreach ($folder in $app_folders)
{
	$version = [regex]::match($folder, 'app-([\d\.]+)').Groups[1].Value
	Write-Output "Patching Version $version"

	$resources = "$folder\resources"
	if (-not(Test-Path -Path "$resources")) {
		Write-Error "Resources folder does not exist. Outdated version?`n"
		continue
	}
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

	Write-Output "Patched $branch (version $version) successfully"
}
