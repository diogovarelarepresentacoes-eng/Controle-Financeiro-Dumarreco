@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================================
REM ATUALIZACAO SEGURA - CONTROLE FINANCEIRO DUMARRECO
REM ----------------------------------------------------------------------------
REM Objetivo:
REM 1) Ler dados/configuracoes da pasta antiga (ex: "... back")
REM 2) Copiar para a pasta nova SEM apagar nada da pasta antiga
REM 3) Criar backups de tudo que for sobrescrito na pasta nova
REM 4) Gerar dumps SQL de containers Postgres (se estiverem rodando)
REM ============================================================================

for %%I in ("%~dp0.") do set "NEW_DIR=%%~fI"
for %%I in ("%NEW_DIR%\..") do set "PARENT_DIR=%%~fI"
set "DEFAULT_OLD_DIR=%PARENT_DIR%\Controle Financeiro Dumarreco back"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%I"
set "LOG_DIR=%NEW_DIR%\migracao_logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\migracao-%TS%.log"

echo ================================================================
echo  Atualizacao Segura - Controle Financeiro Dumarreco
echo ================================================================
echo.
echo Pasta NOVA detectada: "%NEW_DIR%"
echo Pasta ANTIGA padrao:  "%DEFAULT_OLD_DIR%"
echo.
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

echo [INFO] Log: "%LOG_FILE%"
call :log "Pasta nova: %NEW_DIR%"
call :log "Pasta antiga: %OLD_DIR%"

echo.
echo [1/5] Criando backup SQL dos bancos (se Docker estiver rodando)...
call :docker_dump "dumarreco_db" "controle_financeiro" "%OLD_DIR%\backups\pre-migracao-controle-%TS%.sql"
call :validate_backup_file "%OLD_DIR%\backups\pre-migracao-controle-%TS%.sql" "controle_financeiro"
call :docker_dump "crm_dumarreco_db" "crm_dumarreco" "%OLD_DIR%\crm\backups\pre-migracao-crm-%TS%.sql"
call :validate_backup_file "%OLD_DIR%\crm\backups\pre-migracao-crm-%TS%.sql" "crm_dumarreco"

echo [2/5] Copiando arquivos de configuracao...
call :safe_copy "%OLD_DIR%\.env" "%NEW_DIR%\.env"
call :safe_copy "%OLD_DIR%\.env.local" "%NEW_DIR%\.env.local"
call :safe_copy "%OLD_DIR%\.env.docker" "%NEW_DIR%\.env.docker"
call :safe_copy "%OLD_DIR%\backend\.env" "%NEW_DIR%\backend\.env"
call :safe_copy "%OLD_DIR%\crm\.env" "%NEW_DIR%\crm\.env"
call :safe_copy "%OLD_DIR%\crm\apps\api\.env" "%NEW_DIR%\crm\apps\api\.env"

echo [3/5] Copiando pastas de backup...
call :copy_dir "%OLD_DIR%\backups" "%NEW_DIR%\backups"
call :copy_dir "%OLD_DIR%\crm\backups" "%NEW_DIR%\crm\backups"

echo [4/5] Copiando dumps SQL criados para a pasta nova...
call :safe_copy "%OLD_DIR%\backups\pre-migracao-controle-%TS%.sql" "%NEW_DIR%\backups\pre-migracao-controle-%TS%.sql"
call :safe_copy "%OLD_DIR%\crm\backups\pre-migracao-crm-%TS%.sql" "%NEW_DIR%\crm\backups\pre-migracao-crm-%TS%.sql"

echo [5/5] Finalizando...
call :log "Migracao concluida sem deletar dados da pasta antiga."

echo.
echo ================================================================
echo  CONCLUIDO COM SEGURANCA
echo ================================================================
echo - A pasta antiga foi preservada.
echo - Configuracoes importantes foram copiadas para a pasta nova.
echo - DUMP SQL foi tentado para os bancos em Docker.
echo - Veja detalhes no log:
echo   "%LOG_FILE%"
echo.
echo Proximo passo sugerido:
echo 1) Revisar arquivos .env da pasta nova
echo 2) Subir o sistema novo
echo 3) Validar telas e dados antes de remover pasta antiga
echo.
exit /b 0

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
  echo [ERRO] Backup do banco "%LABEL%" esta vazio ou falhou. Atualizacao cancelada para evitar perda de dados.
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
  copy /Y "%DST%" "%DST%.pre-migracao-%TS%.bak" >nul 2>&1
  if errorlevel 1 (
    call :log "ERRO backup destino: %DST%"
    echo [ERRO] Falha ao criar backup do destino: "%DST%"
    exit /b 1
  )
  call :log "Backup destino criado: %DST%.pre-migracao-%TS%.bak"
)

copy /Y "%SRC%" "%DST%" >nul 2>&1
if errorlevel 1 (
  call :log "ERRO copia: %SRC% -> %DST%"
  echo [ERRO] Falha na copia: "%SRC%" -> "%DST%"
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
  echo [ERRO] Falha ao copiar pasta: "%SRC_DIR%"
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
  call :log "ERRO dump %CONTAINER% para %OUT_FILE%"
  echo [ERRO] Falha ao gerar dump do container "%CONTAINER%".
  exit /b 1
)
call :log "OK dump %CONTAINER% -> %OUT_FILE%"
goto :eof

:log
echo [%DATE% %TIME%] %~1>> "%LOG_FILE%"
goto :eof
