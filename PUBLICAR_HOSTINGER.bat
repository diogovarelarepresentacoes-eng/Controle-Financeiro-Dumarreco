@echo off
chcp 65001 >nul
title Deploy Hostinger — Controle Financeiro Dumarreco

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║      Deploy Automático — Controle Financeiro Dumarreco  ║
echo ║      Hostinger FTP → public_html                        ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: ══════════════════════════════════════════════════════════════
:: PASSO 1 — Build de produção
:: ══════════════════════════════════════════════════════════════
echo [1/2] Gerando build de producao...
echo ──────────────────────────────────────────────────────────
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] O build falhou. Verifique os erros acima.
    pause
    exit /b 1
)
echo.
echo [OK] Build concluido!
echo.

:: ══════════════════════════════════════════════════════════════
:: PASSO 2 — Upload FTP (via script PowerShell separado)
:: ══════════════════════════════════════════════════════════════
echo [2/2] Enviando arquivos para o servidor Hostinger...
echo ──────────────────────────────────────────────────────────
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLICAR_HOSTINGER.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha no upload FTP. Verifique sua conexao com a internet.
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Deploy concluido com sucesso!                          ║
echo ║  Acesse: http://82.25.67.101                            ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
