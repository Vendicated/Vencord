@echo off

set dicksword=%localappdata%\Discord\app-*
cd %dicksword%

set app=%cd%\resources\app

if not exist "%app%" (
   echo app folder doesn't exist, nothing to delete.
   pause
   exit
)

rmdir /s /q "%app%"

pause