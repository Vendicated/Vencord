# Vencord Uninstaller

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
Write-Output "===== Select a Branch to unpatch ======"

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

Write-Output "`nUnpatch $branch"

$app_folders = Get-ChildItem -Directory -Path $discord_root |
	Select-String -Pattern "app-"

foreach ($folder in $app_folders)
{
	$version = [regex]::match($folder, 'app-([\d\.]+)').Groups[1].Value
	Write-Output "Unpatching $branch Version $version"

	$resources = "$folder\resources"
	if (-not(Test-Path -Path "$resources")) {
		Write-Output "Resources folder doesn't exist... Possibly an outdated copy and can be ignored.`n"
		continue
	}
	if (-not(Test-Path -Path "$resources\app")) {
		Write-Output "App folder doesn't exist... Already unpatched?`n"
		continue
	}

	Remove-Item -Path "$folder\resources\app" -Recurse -Force -Confirm:$false

	if (Test-Path "$folder\resources\app")
	{
		Write-Error "Failed to delete $folder\resources\app"
	} else {
		Write-Output "Successfully unpatched $branch (version $version)"
	}

}