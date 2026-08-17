@echo off
echo ==============================================
echo   Empaquetando Talking Cro.ow (Backend + UI)
echo ==============================================

echo [1/3] Limpiando carpetas de compilación anteriores...
if exist "backend\dist" rmdir /s /q "backend\dist"
if exist "backend\build" rmdir /s /q "backend\build"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
if exist "frontend\dist_electron" rmdir /s /q "frontend\dist_electron"

echo.
echo [2/3] Compilando Backend (PyInstaller)...
cd backend
call pyinstaller app.spec --clean
if %errorlevel% neq 0 (
    echo Error al compilar el backend.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/3] Compilando e instalando dependencias Frontend...
cd frontend
call npm install
echo Ejecutando Electron Builder...
call npm run electron:build
if %errorlevel% neq 0 (
    echo Error al compilar la aplicacion desktop con Electron Builder.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ==============================================
echo   Empaquetado Completado con Exito!
echo   El instalador de Windows esta en:
echo   frontend/dist_electron/
echo ==============================================
pause
