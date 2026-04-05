# Verifica na VPS se PostgreSQL / Docker estao ok para o projeto (banco controle_financeiro).
# Uso: cd backend; .\scripts\verificar-banco-vps.ps1
# Parametros opcionais: -VpsHost IP -Port 22 -User root
#
# Observacao: o ambiente do Cursor nao consegue abrir SSH ate muitas VPS (timeout de rede).
# Execute este script na sua maquina, onde o SSH funciona.

param(
    [string]$VpsHost = "187.77.253.26",
    [int]$Port = 22,
    [string]$User = "root"
)

$remoteBash = @'
set +e
echo "=== Host ==="
hostname
echo ""
echo "=== Docker ==="
if command -v docker >/dev/null 2>&1; then
  docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
  echo ""
  if docker ps -a --format "{{.Names}}" 2>/dev/null | grep -qx "dumarreco_db"; then
    echo "=== DB controle_financeiro (container dumarreco_db) ==="
    docker exec dumarreco_db psql -U postgres -d controle_financeiro -c "SELECT current_database() AS db, now() AS server_time;" 2>&1
  else
    echo "(Container dumarreco_db nao encontrado — ajuste o compose ou o nome.)"
  fi
else
  echo "Docker nao instalado ou nao no PATH."
fi
echo ""
echo "=== PostgreSQL (servico no host) ==="
systemctl is-active postgresql 2>/dev/null || systemctl is-active postgresql@16-main 2>/dev/null || systemctl is-active postgresql@15-main 2>/dev/null || echo "(servico postgresql nao ativo / nao encontrado)"
echo ""
echo "=== Bancos (usuario postgres no host, se existir) ==="
if sudo -u postgres psql -c '\l' 2>/dev/null | head -50; then
  :
else
  echo "(Nao foi possivel listar via sudo -u postgres psql.)"
fi
echo ""
echo "=== Porta 5432 ==="
ss -tlnp 2>/dev/null | grep 5432 || netstat -tlnp 2>/dev/null | grep 5432 || echo "(nada ou comando indisponivel)"
'@

Write-Host "Conectando ${User}@${VpsHost}:${Port} (digite a senha SSH se solicitado)..." -ForegroundColor Cyan
$remoteBash | ssh -p $Port -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "${User}@${VpsHost}" bash -s
$exit = $LASTEXITCODE
if ($exit -ne 0) {
    Write-Host ""
    Write-Host "Falha na conexao SSH (codigo $exit). Verifique: IP, porta SSH, firewall da hospedagem, se o servico sshd esta ativo." -ForegroundColor Yellow
    exit $exit
}
