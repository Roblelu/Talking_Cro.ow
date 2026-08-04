@echo off
echo =========================================
echo Limpiando sistema Talking Crow...
echo =========================================

:: Matar Node.js (Vite/Electron)
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1

:: Matar Python (Backend)
taskkill /F /IM python.exe /T >nul 2>&1

:: Matar Navegadores Fantasmas y Tuneles
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM cloudflared.exe /T >nul 2>&1
taskkill /F /IM cloudflared-windows-amd64.exe /T >nul 2>&1

echo Limpieza completada.
exit
