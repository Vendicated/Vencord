# Vencord Uninstaller

$discord_root = "$env:LOCALAPPDATA\Discord"

$app_folders = Get-ChildItem -Directory -Path $discord_root |
	Select-String -Pattern "app-"

foreach ($folder in $app_folders)
{
	$version = [regex]::match($folder, 'app-([\d\.]+)').Groups[1].Value
	Write-Output "Unpatching Version $version"

	Remove-Item -Path "$folder\resources\app" -Recurse -Force -Confirm:$false

	if (Test-Path "$folder\resources\app")
	{
		Write-Error "Failed to delete $folder\resources\app"
	} else {
		Write-Output "Successfully unpatched Discord (version $version)"
	}

}