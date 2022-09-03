@echo off

:: CD to the same directory as install.bat since running the batch file as admin CDs to System32
cd %~dp0
set patcher=%cd%\dist\patcher.js

set dicksword=%localappdata%\DiscordCanary\app-*
cd %dicksword%

set app=%cd%\resources\app

if exist "%app%" (
   echo app folder exists. Looks like your Discord is already modified.
   pause
   exit
)

mkdir "%app%"

set patcher=%patcher:\=/%

(
    echo require^("%patcher%"^);
    echo require^("../app.asar"^);
) > %app%\index.js

(
    echo {
    echo   "main": "index.js",
    echo   "name": "discord"
    echo }
) > %app%\package.json

pause