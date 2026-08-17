@echo off
title Empaquetar Talking Crow (Setup.exe)
echo ==========================================================
echo 1. Empaquetando Backend de Python (PyInstaller)...
echo ==========================================================
cd backend
call build_backend.bat
if %errorlevel% neq 0 (
    echo Error empaquetando el backend.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ==========================================================
echo 2. Empaquetando Frontend (Electron Builder)...
echo ==========================================================
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Error compilando el frontend (Vite).
    pause
    exit /b %errorlevel%
)

call npm run electron:build
if %errorlevel% neq 0 (
    echo Error empaquetando con Electron Builder.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ==========================================================
echo EXITO!
echo El instalador final esta en:
echo frontend\dist_electron\Talking Crow Setup 0.0.0.exe
echo ==========================================================
pause
