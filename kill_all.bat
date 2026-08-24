@echo off
echo =========================================
echo Limpiando sistema Talking Cro.ow...
echo =========================================

:: Cerrar exclusivamente las consolas y procesos hijos de Talking Crow.
taskkill /F /FI "WINDOWTITLE eq TalkingCrow*" /T >nul 2>&1

:: Cerrar Node (Vite/Servidores) y Electron que se quedan en segundo plano
echo Limpiando procesos de Node y Electron ocultos...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1

:: Liberar el puerto 5175 si sigue tomado
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5175') do taskkill /F /PID %%a >nul 2>&1

echo Limpieza completada.
exit
