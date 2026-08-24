@echo off
cd /d "%~dp0"

echo Iniciando Emuladores de Firebase en la Nube Local...
start "Talking Cro.ow - Nube Firebase" cmd /k "npx firebase emulators:start --only functions"

timeout /t 5 >nul

echo Iniciando Servidor Web (React)...
start "Talking Cro.ow - Portal Web (Puerto 3000)" cmd /k "npm run dev"

echo Abriendo navegador (Opera)...
timeout /t 2 >nul
start opera http://localhost:3000

exit
