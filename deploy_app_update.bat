@echo off
setlocal
echo ==========================================================
echo Actualizador de Talking Crow (Auto-Updater)
echo ==========================================================
echo.
set /p NEW_VERSION="Ingresa la nueva version (ejemplo: 1.0.1): "

echo.
echo ==========================================================
echo 1. Actualizando package.json con la version %NEW_VERSION%...
echo ==========================================================
cd frontend
call npm version %NEW_VERSION% --no-git-tag-version
cd ..

echo.
echo ==========================================================
echo 2. Empaquetando nueva version...
echo ==========================================================
call package_app.bat
if %errorlevel% neq 0 (
    echo Error durante el empaquetado.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================================
echo 3. Creando Release en GitHub y subiendo archivos...
echo ==========================================================
echo (Asegurate de estar autenticado en GitHub CLI 'gh auth login' con la cuenta de Roblelu)
gh release create v%NEW_VERSION% "frontend\dist_electron\Talking_Cro.ow_%NEW_VERSION%.exe" "frontend\dist_electron\Talking_Cro.ow_%NEW_VERSION%.exe.blockmap" "frontend\dist_electron\latest.yml" --title "Talking Crow v%NEW_VERSION%" --notes "Actualizacion menor."
if %errorlevel% neq 0 (
    echo Ocurrio un error al subir los archivos a GitHub.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================================
echo EXITOSO! La actualizacion v%NEW_VERSION% esta en linea.
echo Los usuarios la descargaran automaticamente.
echo ==========================================================
pause
