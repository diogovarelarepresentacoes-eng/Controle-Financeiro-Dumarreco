# Script para configurar DATABASE_URL no backend
# Execute: cd backend; .\scripts\configurar-banco.ps1

$envPath = Join-Path $PSScriptRoot "..\\.env"
$envExample = Join-Path $PSScriptRoot "..\\.env.example"

if (-not (Test-Path $envPath)) {
    Copy-Item $envExample $envPath
    Write-Host "Arquivo .env criado a partir do .env.example"
}

$senha = Read-Host "Digite a senha do usuario 'postgres' do PostgreSQL (ou Enter para manter a atual)"
if ($senha -eq "") {
    Write-Host "Nenhuma alteracao feita."
    exit 0
}

$encoded = [System.Web.HttpUtility]::UrlEncode($senha)
$newUrl = "postgresql://postgres:${encoded}@localhost:5432/controle_financeiro?schema=public"
$content = Get-Content $envPath -Raw
$content = $content -replace 'DATABASE_URL="postgresql://postgres:[^"]*@', "DATABASE_URL=`"postgresql://postgres:${encoded}@"
Set-Content $envPath $content -NoNewline
Write-Host "DATABASE_URL atualizado em backend/.env"
Write-Host "Execute: npm run prisma:migrate"
