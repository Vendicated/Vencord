@echo off
echo Checking npm version
call npm --version
IF %ERRORLEVEL% EQU 0 (
    echo npm is installed
) ELSE (
    echo npm is not installed
    echo Installing npm
    call winget install OpenJS.NodeJS
)
echo Checking pnpm version
call pnpm --version
IF %ERRORLEVEL% EQU 0 (
    echo pnpm is installed
) ELSE (
    echo pnpm is not installed
    echo Installing pnpm
    call npm i -g pnpm
)
echo Cloning repository
call git clone https://github.com/dragdotpng/Vencord
cd Vencord
echo Installing dependencies
call pnpm install --frozen-lockfile
echo Building project
call pnpm build
echo Injecting project
call pnpm inject
