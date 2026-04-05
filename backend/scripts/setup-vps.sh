#!/bin/bash
set -e

IP_PUBLICO=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo "============================================="
echo "  SETUP COMPLETO - Controle Financeiro VPS"
echo "============================================="
echo "  Servidor: $(hostname) / $IP_PUBLICO"
echo "============================================="
echo ""

# ── 1. Atualizar sistema ──────────────────────────────────────────────
echo "[1/7] Atualizando pacotes do sistema..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Instalar Docker (se nao existir) ───────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[2/7] Instalando Docker..."
  apt-get install -y -qq ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "  Docker instalado!"
else
  echo "[2/7] Docker ja instalado: $(docker --version)"
fi

# ── 3. Instalar Git (se nao existir) ──────────────────────────────────
if ! command -v git &>/dev/null; then
  echo "[3/7] Instalando Git..."
  apt-get install -y -qq git
else
  echo "[3/7] Git ja instalado: $(git --version)"
fi

# ── 4. Clonar / atualizar repositorio ─────────────────────────────────
PROJETO_DIR="/var/www/controle-financeiro"

echo "[4/7] Preparando repositorio em $PROJETO_DIR..."
if [ -d "$PROJETO_DIR/.git" ]; then
  echo "  Repositorio ja existe. Fazendo git pull..."
  cd "$PROJETO_DIR"
  git pull origin main || echo "  (git pull falhou — verifique conflitos manualmente)"
else
  echo "  Clonando repositorio..."
  mkdir -p /var/www
  git clone https://github.com/diogovarelarepresentacoes-eng/Controle-Financeiro-Dumarreco.git "$PROJETO_DIR"
  cd "$PROJETO_DIR"
fi

echo "  Repositorio pronto em $PROJETO_DIR"

# ── 5. Criar .env.docker ─────────────────────────────────────────────
echo "[5/7] Configurando variaveis de ambiente..."

ENV_FILE="$PROJETO_DIR/.env.docker"

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<ENVEOF
POSTGRES_DB=controle_financeiro
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Dumarreco2026!
POSTGRES_PORT=5432
API_PORT=3333
WEB_PORT=80
VITE_API_BASE_URL=http://${IP_PUBLICO}:3333
VITE_CRM_API_URL=http://${IP_PUBLICO}:4000
ENVEOF
  echo "  .env.docker criado."
  echo "  IMPORTANTE: edite a senha do banco em $ENV_FILE se desejar outra."
else
  echo "  .env.docker ja existe — mantendo o atual."
fi

# ── 6. Subir containers ──────────────────────────────────────────────
echo "[6/7] Construindo e subindo containers (pode levar alguns minutos)..."
cd "$PROJETO_DIR"
docker compose --env-file .env.docker up -d --build

echo ""
echo "  Aguardando banco ficar saudavel (ate 90s)..."
for i in $(seq 1 18); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' dumarreco_db 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    echo "  Banco PostgreSQL: HEALTHY"
    break
  fi
  echo "  [$i] Status: $STATUS — aguardando 5s..."
  sleep 5
done

# ── 7. Verificacao final ─────────────────────────────────────────────
echo ""
echo "[7/7] Verificacao final..."
echo ""
echo "--- Containers ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "--- Teste do banco controle_financeiro ---"
docker exec dumarreco_db psql -U postgres -d controle_financeiro -c "SELECT current_database() AS banco, now() AS hora_servidor;" 2>&1 || echo "ERRO: banco nao respondeu"
echo ""

echo "--- Tabelas Prisma ---"
docker exec dumarreco_db psql -U postgres -d controle_financeiro -c "\dt" 2>&1 || echo "(sem tabelas ainda)"
echo ""

echo "--- Health da API ---"
sleep 3
curl -s http://127.0.0.1:3333/health 2>&1 || echo "API nao respondeu em /health"
echo ""

echo ""
echo "============================================="
echo "  SETUP CONCLUIDO!"
echo "============================================="
echo ""
echo "  Acesse o sistema: http://${IP_PUBLICO}"
echo "  API:              http://${IP_PUBLICO}:3333"
echo "  Banco:            PostgreSQL na porta 5432"
echo ""
echo "  Arquivos:         $PROJETO_DIR"
echo "  Env:              $ENV_FILE"
echo ""
echo "  Para ver logs:    docker compose -f $PROJETO_DIR/docker-compose.yml logs -f"
echo "  Para parar:       docker compose -f $PROJETO_DIR/docker-compose.yml down"
echo "============================================="
