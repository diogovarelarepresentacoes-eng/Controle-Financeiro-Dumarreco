@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================================
REM MENU DE ATUALIZACAO SEGURA - CONTROLE FINANCEIRO DUMARRECO
REM ============================================================================

for %%I in ("%~dp0.") do set "NEW_DIR=%%~fI"
for %%I in ("%NEW_DIR%\..") do set "PARENT_DIR=%%~fI"
set "DEFAULT_OLD_DIR=%PARENT_DIR%\Controle Financeiro Dumarreco back"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%I"
set "LOG_DIR=%NEW_DIR%\migracao_logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\menu-migracao-%TS%.log"

call :banner
call :pick_old_dir

:menu
echo.
echo ================= MENU =================
echo [1] Somente BACKUP SQL (containers Docker)
echo [2] Somente MIGRACAO de configuracoes/arquivos
echo [3] FLUXO COMPLETO (backup + migracao + docker compose up)
echo [4] Sair
echo ========================================
set /p OPTION=Escolha uma opcao: 

if "%OPTION%"=="1" goto backup_only
if "%OPTION%"=="2" goto migrate_only
if "%OPTION%"=="3" goto full_flow
if "%OPTION%"=="4" goto end_ok

echo Opcao invalida.
goto menu

:backup_only
call :log "Opcao escolhida: backup_only"
call :run_backup
goto done_step

:migrate_only
call :log "Opcao escolhida: migrate_only"
call :run_migration
goto done_step

:full_flow
call :log "Opcao escolhida: full_flow"
call :run_backup
if errorlevel 1 goto end_error
call :run_migration
if errorlevel 1 goto end_error
call :bring_docker_up
if errorlevel 1 goto end_error
goto done_step

:done_step
echo.
echo Operacao concluida. Veja o log:
echo "%LOG_FILE%"
echo.
goto menu

:run_backup
echo.
echo [BACKUP] Gerando dumps SQL...
call :docker_dump "dumarreco_db" "controle_financeiro" "%OLD_DIR%\backups\pre-migracao-controle-%TS%.sql"
if errorlevel 1 goto :eof
call :validate_backup_file "%OLD_DIR%\backups\pre-migracao-controle-%TS%.sql" "controle_financeiro"
if errorlevel 1 goto :eof
call :docker_dump "crm_dumarreco_db" "crm_dumarreco" "%OLD_DIR%\crm\backups\pre-migracao-crm-%TS%.sql"
if errorlevel 1 goto :eof
call :validate_backup_file "%OLD_DIR%\crm\backups\pre-migracao-crm-%TS%.sql" "crm_dumarreco"
if errorlevel 1 goto :eof

call :safe_copy "%OLD_DIR%\backups\pre-migracao-controle-%TS%.sql" "%NEW_DIR%\backups\pre-migracao-controle-%TS%.sql"
if errorlevel 1 goto :eof
call :safe_copy "%OLD_DIR%\crm\backups\pre-migracao-crm-%TS%.sql" "%NEW_DIR%\crm\backups\pre-migracao-crm-%TS%.sql"
if errorlevel 1 goto :eof
echo [BACKUP] OK.
goto :eof

:run_migration
echo.
echo [MIGRACAO] Copiando configuracoes e backups...
call :safe_copy "%OLD_DIR%\.env" "%NEW_DIR%\.env"
if errorlevel 1 goto :eof
call :safe_copy "%OLD_DIR%\.env.local" "%NEW_DIR%\.env.local"
if errorlevel 1 goto :eof
call :safe_copy "%OLD_DIR%\.env.docker" "%NEW_DIR%\.env.docker"
if errorlevel 1 goto :eof
call :safe_copy "%OLD_DIR%\backend\.env" "%NEW_DIR%\backend\.env"
if errorlevel 1 goto :eof
call :safe_copy "%OLD_DIR%\crm\.env" "%NEW_DIR%\crm\.env"
if errorlevel 1 goto :eof
call :safe_copy "%OLD_DIR%\crm\apps\api\.env" "%NEW_DIR%\crm\apps\api\.env"
if errorlevel 1 goto :eof

call :copy_dir "%OLD_DIR%\backups" "%NEW_DIR%\backups"
if errorlevel 1 goto :eof
call :copy_dir "%OLD_DIR%\crm\backups" "%NEW_DIR%\crm\backups"
if errorlevel 1 goto :eof
echo [MIGRACAO] OK.
goto :eof

:bring_docker_up
echo.
echo [DOCKER] Subindo servicos...
if exist "%NEW_DIR%\docker-compose.yml" (
  pushd "%NEW_DIR%"
  docker compose up -d --build >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    popd
    call :log "ERRO docker compose up na raiz."
    echo [ERRO] Falha ao subir docker compose na raiz.
    exit /b 1
  )
  popd
  echo [DOCKER] Stack da raiz subida.
  call :log "docker compose up executado na raiz."
) else (
  call :log "SKIP docker raiz: docker-compose.yml nao encontrado."
)

if exist "%NEW_DIR%\crm\docker-compose.yml" (
  pushd "%NEW_DIR%\crm"
  docker compose up -d --build >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    popd
    call :log "ERRO docker compose up no crm."
    echo [ERRO] Falha ao subir docker compose em crm.
    exit /b 1
  )
  popd
  echo [DOCKER] Stack crm subida.
  call :log "docker compose up executado em crm."
) else (
  call :log "SKIP docker crm: docker-compose.yml nao encontrado."
)
goto :eof

:pick_old_dir
echo Pasta NOVA: "%NEW_DIR%"
echo Pasta ANTIGA padrao: "%DEFAULT_OLD_DIR%"
set /p OLD_DIR=Digite a pasta ANTIGA (ENTER para padrao): 
if "%OLD_DIR%"=="" set "OLD_DIR=%DEFAULT_OLD_DIR%"

if not exist "%OLD_DIR%" (
  echo [ERRO] Pasta antiga nao encontrada: "%OLD_DIR%"
  exit /b 1
)

if /I "%OLD_DIR%"=="%NEW_DIR%" (
  echo [ERRO] Pasta antiga e pasta nova nao podem ser iguais.
  exit /b 1
)

call :log "Pasta nova: %NEW_DIR%"
call :log "Pasta antiga: %OLD_DIR%"
goto :eof

:validate_backup_file
set "FILE=%~1"
set "LABEL=%~2"
if not exist "%FILE%" (
  call :log "SKIP validacao (arquivo nao existe): %FILE%"
  goto :eof
)
for %%A in ("%FILE%") do set "SIZE=%%~zA"
if "%SIZE%"=="0" (
  call :log "ERRO: Backup vazio ou falhou: %FILE%"
  echo [ERRO] Backup do banco "%LABEL%" esta vazio ou falhou. Operacao cancelada.
  exit /b 1
)
call :log "Backup validado com sucesso: %FILE% (%SIZE% bytes)"
goto :eof

:safe_copy
set "SRC=%~1"
set "DST=%~2"

if not exist "%SRC%" (
  call :log "SKIP (nao existe): %SRC%"
  goto :eof
)
for %%A in ("%SRC%") do set "SRC_SIZE=%%~zA"
if "%SRC_SIZE%"=="0" (
  call :log "AVISO: Arquivo origem vazio, nao sobrescrevendo: %SRC%"
  echo [AVISO] Arquivo de origem vazio, mantendo destino: "%~nx1"
  goto :eof
)

for %%I in ("%DST%") do set "DST_DIR=%%~dpI"
if not exist "%DST_DIR%" mkdir "%DST_DIR%"

if exist "%DST%" (
  copy /Y "%DST%" "%DST%.pre-menu-%TS%.bak" >nul 2>&1
  if errorlevel 1 (
    call :log "ERRO backup destino: %DST%"
    echo [ERRO] Falha ao criar backup de "%DST%"
    exit /b 1
  )
)

copy /Y "%SRC%" "%DST%" >nul 2>&1
if errorlevel 1 (
  call :log "ERRO copia: %SRC% -> %DST%"
  echo [ERRO] Falha ao copiar "%SRC%"
  exit /b 1
)
call :log "OK copia: %SRC% -> %DST%"
goto :eof

:copy_dir
set "SRC_DIR=%~1"
set "DST_DIR=%~2"

if not exist "%SRC_DIR%" (
  call :log "SKIP pasta (nao existe): %SRC_DIR%"
  goto :eof
)

if not exist "%DST_DIR%" mkdir "%DST_DIR%"
robocopy "%SRC_DIR%" "%DST_DIR%" /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /NFL /NDL /NP /NJH /NJS >> "%LOG_FILE%" 2>&1
if errorlevel 8 (
  call :log "ERRO robocopy: %SRC_DIR% -> %DST_DIR%"
  echo [ERRO] Falha ao copiar pasta "%SRC_DIR%"
  exit /b 1
)
call :log "OK pasta: %SRC_DIR% -> %DST_DIR%"
goto :eof

:docker_dump
set "CONTAINER=%~1"
set "DB_NAME=%~2"
set "OUT_FILE=%~3"

where docker >nul 2>&1
if errorlevel 1 (
  call :log "SKIP dump %CONTAINER% (docker nao encontrado)"
  goto :eof
)

for %%I in ("%OUT_FILE%") do set "OUT_DIR=%%~dpI"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

docker ps --format "{{.Names}}" | findstr /I /X "%CONTAINER%" >nul 2>&1
if errorlevel 1 (
  call :log "SKIP dump %CONTAINER% (container nao esta rodando)"
  goto :eof
)

docker exec -i "%CONTAINER%" pg_dump -U postgres -d "%DB_NAME%" > "%OUT_FILE%" 2>> "%LOG_FILE%"
if errorlevel 1 (
  call :log "ERRO dump %CONTAINER% -> %OUT_FILE%"
  echo [ERRO] Falha no dump do container "%CONTAINER%".
  exit /b 1
)
call :log "OK dump %CONTAINER% -> %OUT_FILE%"
goto :eof

:banner
echo ================================================================
echo  MENU - ATUALIZACAO SEGURA DUMARRECO
echo ================================================================
echo.
echo Este script NAO apaga a pasta antiga.
echo Ele prioriza backup antes de atualizar.
echo.
goto :eof

:log
echo [%DATE% %TIME%] %~1>> "%LOG_FILE%"
goto :eof

:end_error
echo.
echo [ERRO] Processo interrompido. Consulte:
echo "%LOG_FILE%"
exit /b 1

:end_ok
echo.
echo Encerrado.
echo Log: "%LOG_FILE%"
exit /b 0
