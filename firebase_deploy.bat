@echo off
echo =======================================================
echo Iniciando proceso de compilacion y despliegue web...
echo =======================================================

cd web

echo.
echo [1/2] Compilando la aplicacion web (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo Error al compilar la aplicacion.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Desplegando en Firebase (Hosting, Functions, Rules)...
call npx firebase-tools deploy --only hosting,functions,firestore:rules
if %errorlevel% neq 0 (
    echo Error al desplegar en Firebase.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo ¡Despliegue completado con exito!
echo =======================================================
pause
