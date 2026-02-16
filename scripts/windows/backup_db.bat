@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0..\.."
cd /d "%ROOT_DIR%"

if not exist "backups" mkdir "backups"
if not exist "backups\db" mkdir "backups\db"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
set "BACKUP_FILE=backups\db\dumarreco_backup_%TS%.sql"

echo [1/2] Verificando servico de banco...
docker compose ps db >nul 2>&1
if errorlevel 1 (
  echo ERRO: Servico "db" nao encontrado no docker compose.
  exit /b 1
)

echo [2/2] Gerando backup em "%BACKUP_FILE%"...
docker compose exec -T db sh -c "pg_dump -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-controle_financeiro}" > "%BACKUP_FILE%"
if errorlevel 1 (
  echo ERRO: Falha ao gerar backup.
  exit /b 1
)

echo Backup concluido com sucesso.
echo Arquivo: %BACKUP_FILE%
exit /b 0
