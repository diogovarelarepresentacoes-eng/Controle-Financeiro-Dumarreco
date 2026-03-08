@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM INSTALACAO LOCAL - CONTROLE FINANCEIRO DUMARRECO
REM ----------------------------------------------------------------------------
REM Instalacao sem Docker (PostgreSQL local, npm run dev)
REM Execute na raiz do projeto.
REM ============================================================================

for %%I in ("%~dp0.") do set "ROOT=%%~fI"
cd /d "%ROOT%"

echo ================================================================
echo  Instalacao Local - Controle Financeiro Dumarreco
echo ================================================================
echo.

echo [1/6] Copiando arquivos de configuracao...
if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo   .env criado a partir do .env.example
  ) else (
    echo   [AVISO] .env.example nao encontrado. Crie .env manualmente.
  )
) else (
  echo   .env ja existe, mantido.
)

if not exist "backend\.env" (
  if exist "backend\.env.example" (
    copy "backend\.env.example" "backend\.env" >nul
    echo   backend\.env criado. Ajuste DATABASE_URL com a senha do PostgreSQL.
  ) else (
    echo   [AVISO] backend\.env.example nao encontrado.
  )
) else (
  echo   backend\.env ja existe, mantido.
)

echo.
echo [2/6] Instalando dependencias da raiz...
call npm install
if errorlevel 1 (
  echo ERRO: npm install na raiz falhou.
  exit /b 1
)

echo.
echo [3/6] Instalando dependencias do backend...
pushd backend
call npm install
if errorlevel 1 (
  popd
  echo ERRO: npm install no backend falhou.
  exit /b 1
)
popd

echo.
echo [4/6] Gerando cliente Prisma...
pushd backend
call npm run prisma:generate
if errorlevel 1 (
  popd
  echo ERRO: prisma generate falhou.
  exit /b 1
)
popd

echo.
echo [5/6] Aplicando migracoes do banco...
pushd backend
call npm run prisma:migrate
if errorlevel 1 (
  popd
  echo [AVISO] prisma migrate falhou. Verifique DATABASE_URL em backend\.env
  echo   Execute manualmente: cd backend ^&^& npm run prisma:migrate
  pause
) else (
  popd
)

echo.
echo [6/6] Instalacao concluida.
echo.
echo ================================================================
echo  PROXIMOS PASSOS
echo ================================================================
echo 1. Ajuste backend\.env com a senha correta do PostgreSQL.
echo 2. Terminal 1: cd backend ^&^& npm run dev
echo 3. Terminal 2: npm run dev
echo.
echo URLs:
echo   - Frontend: http://localhost:5173
echo   - API:      http://localhost:3333
echo.
pause
