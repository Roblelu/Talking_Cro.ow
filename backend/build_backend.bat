@echo off
setlocal
cd /d "%~dp0"
echo =======================================================
echo Construyendo el Backend Cifrado de Talking Crow
echo =======================================================

echo [1/3] Activando entorno virtual...
if not exist venv (
    echo El entorno virtual no existe.
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

echo [2/3] Instalando dependencias de cifrado (Nuitka)...
pip install nuitka httpx requests pydantic fastapi uvicorn azure-cognitiveservices-speech TikTokLive

echo [3/3] Compilando app.py a ejecutable nativo con Nuitka...
:: Usamos Nuitka para compilar a codigo maquina C, brindando maxima ofuscacion y rendimiento
nuitka --onefile --assume-yes-for-downloads --windows-console-mode=disable ^
    --output-dir=dist ^
    --output-filename=tc_engine.exe ^
    --include-package=fastapi ^
    --include-package=TikTokLive ^
    --include-package=pydantic ^
    --include-package=azure ^
    --include-package=edge_tts ^
    --include-package=uvicorn ^
    --include-package=httpx ^
    --include-package=requests ^
    --include-package=sqlite3 ^
    app.py

if %errorlevel% neq 0 (
    echo Error critico durante la compilacion de Nuitka.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo [EXITO] Compilacion de cifrado completada. El ejecutable seguro esta en backend/dist/tc_engine.exe
echo =======================================================
exit /b 0
