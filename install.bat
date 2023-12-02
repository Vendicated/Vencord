
npm --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo npm is installed
) ELSE (
    echo npm is not installed
    echo Installing npm
    winget install OpenJS.NodeJS
    exit /b
)
pnpm --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo pnpm is installed
) ELSE (
    echo pnpm is not installed
    echo Installing pnpm
    npm i -g pnpm
)
git clone https://github.com/drsgdotpng/Vencord
cd Vencord

pnpm install --frozen-lockfile
pnpm build
pnpm inject
