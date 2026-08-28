@echo off
echo =======================================================
echo Construyendo el Backend de Talking Crow con PyInstaller
echo =======================================================

cd /d "%~dp0"

echo [1/3] Activando entorno virtual...
if not exist venv (
    echo El entorno virtual no existe. Instala las dependencias primero.
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

echo [2/3] Instalando Nuitka...
pip install nuitka

echo [3/3] Compilando app.py a ejecutable nativo con Nuitka...
:: Usamos Nuitka para compilar a codigo maquina C, brindando maxima ofuscacion y rendimiento
nuitka --onefile --assume-yes-for-downloads ^
    --output-dir=dist ^
    --output-filename=app.exe ^
    --include-package=fastapi ^
    --include-package=TikTokLive ^
    --include-package=pydantic ^
    --include-package=edge_tts ^
    --include-package=uvicorn ^
    app.py

if %errorlevel% neq 0 (
    echo Error durante la compilacion con Nuitka.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo Compilacion exitosa. El ejecutable esta en backend/dist/app.exe
echo =======================================================
