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

echo [2/3] Instalando PyInstaller...
pip install pyinstaller

echo [3/3] Compilando app.py...
pyinstaller --noconfirm --log-level=WARN ^
    --onefile ^
    --name app ^
    --hidden-import "edge_tts" ^
    --hidden-import "TikTokLive" ^
    --hidden-import "fastapi" ^
    --hidden-import "uvicorn" ^
    --hidden-import "pydantic" ^
    --hidden-import "asyncio" ^
    app.py

if %errorlevel% neq 0 (
    echo Error durante la compilacion.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo Compilacion exitosa. El ejecutable esta en backend/dist/app.exe
echo =======================================================
