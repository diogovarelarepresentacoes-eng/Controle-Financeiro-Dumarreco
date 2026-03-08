@echo off
setlocal EnableDelayedExpansion

set "ROOT_DIR=%~dp0..\.."
cd /d "%ROOT_DIR%"

echo ===========================================
echo Atualizacao segura - Controle Financeiro
echo ===========================================
echo.

echo [1/5] Backup do banco...
call "%~dp0backup_db.bat"
if errorlevel 1 (
  echo ERRO: backup falhou. Atualizacao cancelada.
  exit /b 1
)

echo [2/5] Validando backup...
set "LATEST="
for /f "delims=" %%i in ('dir /b /o-d backups\db\*.sql 2^>nul') do (
  set "LATEST=%%i"
  goto :backup_validated
)
echo ERRO: Nenhum arquivo de backup encontrado.
exit /b 1
:backup_validated
for %%A in ("backups\db\!LATEST!") do set "BACKUP_SIZE=%%~zA"
if "!BACKUP_SIZE!"=="0" (
  echo ERRO: Backup esta vazio. Atualizacao cancelada para evitar perda de dados.
  exit /b 1
)
echo Backup validado com sucesso: !LATEST! (!BACKUP_SIZE! bytes)

echo.
echo [3/5] Atualizando codigo (git pull)...
git pull
if errorlevel 1 (
  echo ERRO: git pull falhou.
  exit /b 1
)

echo.
echo [4/5] Rebuild e subida segura dos containers...
docker compose up -d --build
if errorlevel 1 (
  echo ERRO: docker compose up falhou.
  exit /b 1
)

echo.
echo [5/5] Validacao final...
docker compose ps

echo.
echo Atualizacao concluida com seguranca.
echo IMPORTANTE: Nao use "docker compose down -v" em producao.
echo.
exit /b 0
