@echo off
title Administrador de Tickets de Soporte
color 0A

echo =======================================================
echo Iniciando Administrador de Tickets de Soporte...
echo =======================================================

cd backend

:: Verificar si el entorno virtual existe
if not exist "venv\Scripts\python.exe" (
    echo Error: No se encontro el entorno virtual en backend\venv.
    echo Ejecuta el backend primero o instala las dependencias.
    pause
    exit /b 1
)

:: Ejecutar el script usando el Python del entorno virtual
call venv\Scripts\python.exe admin_support.py

:: Al salir, pausa para ver si hubo algun error critico
if %errorlevel% neq 0 (
    echo.
    echo El script termino con errores.
    pause
)
