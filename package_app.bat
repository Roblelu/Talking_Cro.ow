@echo off
setlocal
cd /d "%~dp0"
call backend\build_backend.bat
if errorlevel 1 exit /b 1
cd frontend
call npm run build
if errorlevel 1 exit /b 1
for /f "delims=" %%I in ('node -p "require('./package.json').version"') do set APP_VERSION=%%I
call npx electron-builder --win --publish never --config.directories.output=dist_electron/%APP_VERSION%
if errorlevel 1 exit /b 1
echo Instalador generado en frontend\dist_electron\%APP_VERSION%
exit /b 0
