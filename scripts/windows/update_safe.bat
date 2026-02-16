@echo off
setlocal

set "ROOT_DIR=%~dp0..\.."
cd /d "%ROOT_DIR%"

echo ===========================================
echo Atualizacao segura - Controle Financeiro
echo ===========================================
echo.

echo [1/4] Backup do banco...
call "%~dp0backup_db.bat"
if errorlevel 1 (
  echo ERRO: backup falhou. Atualizacao cancelada.
  exit /b 1
)

echo.
echo [2/4] Atualizando codigo (git pull)...
git pull
if errorlevel 1 (
  echo ERRO: git pull falhou.
  exit /b 1
)

echo.
echo [3/4] Rebuild e subida segura dos containers...
docker compose up -d --build
if errorlevel 1 (
  echo ERRO: docker compose up falhou.
  exit /b 1
)

echo.
echo [4/4] Validacao final...
docker compose ps

echo.
echo Atualizacao concluida com seguranca.
echo IMPORTANTE: Nao use "docker compose down -v" em producao.
echo.
exit /b 0
