@echo off
setlocal
cd /d "%~dp0"
set "NEW_VERSION=%~1"
for /f "delims=" %%a in ('node -p "require('./frontend/package.json').version"') do set "OLD_VERSION=%%a"
if not defined NEW_VERSION (
    echo ==============================================
    echo Version actual instalada: %OLD_VERSION%
    echo ==============================================
    set /p NEW_VERSION="Version a publicar (ej. 1.3.9): "
)

echo.
echo [1] Actualizando version interna...
cd frontend
call npm version %NEW_VERSION% --no-git-tag-version --allow-same-version
if errorlevel 1 (
    echo Error al actualizar package.json.
    pause
    exit /b 1
)
cd ..

echo.
echo [2] Empaquetando la aplicacion...
call package_app.bat
if errorlevel 1 (
    echo Error durante el empaquetado.
    pause
    exit /b 1
)

set "ARTIFACT_DIR=frontend\dist_electron\%NEW_VERSION%"
if not exist "%ARTIFACT_DIR%\Talking_Cro.ow_%NEW_VERSION%.exe" (
    echo No se encontro el instalador generado.
    pause
    exit /b 1
)
if not exist "%ARTIFACT_DIR%\latest.yml" (
    echo No se encontro el archivo latest.yml.
    pause
    exit /b 1
)

echo.
echo [3] Verificando seguridad del instalador...
python verify_release.py "%ARTIFACT_DIR%" %NEW_VERSION%
if errorlevel 1 (
    echo La verificacion de seguridad fallo. Credenciales o archivos invalidos.
    pause
    exit /b 1
)

echo.
echo [4] Subiendo actualizacion a GitHub...
set "NOTES_ARG=--notes "Actualizacion menor.""
if exist "references\release-%NEW_VERSION%.md" (
    set "NOTES_ARG=--notes-file "references\release-%NEW_VERSION%.md""
)

gh release create v%NEW_VERSION% "%ARTIFACT_DIR%\Talking_Cro.ow_%NEW_VERSION%.exe" "%ARTIFACT_DIR%\Talking_Cro.ow_%NEW_VERSION%.exe.blockmap" "%ARTIFACT_DIR%\latest.yml" --repo Roblelu/Talking_Cro.ow --title "Talking Crow v%NEW_VERSION%" %NOTES_ARG% %2
if errorlevel 1 (
    echo Ocurrio un error al subir a GitHub. Comprueba tu conexion o tu sesion de gh.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo EXITOSO! La actualizacion v%NEW_VERSION% esta en linea.
echo Los usuarios la descargaran automaticamente.
echo ==========================================================
pause
exit /b 0
