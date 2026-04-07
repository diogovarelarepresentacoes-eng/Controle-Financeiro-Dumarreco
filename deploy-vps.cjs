/**
 * Deploy na VPS: firewall (UFW), git pull, Docker, Let's Encrypt, recarga do nginx.
 *
 * Uso (PowerShell): $env:SSH_PASSWORD='...'; node deploy-vps.cjs
 * Opcional: $env:CERTBOT_EMAIL='seu@email.com'
 */
const { Client } = require('ssh2')

const password = process.env.SSH_PASSWORD || process.env.SSH_PASS
if (!password) {
  console.error('Defina SSH_PASSWORD (ou SSH_PASS) no ambiente.')
  process.exit(1)
}

const host = process.env.SSH_HOST || '187.77.253.26'
const port = Number(process.env.SSH_PORT || 22)
const username = process.env.SSH_USER || 'root'
const certEmail = process.env.CERTBOT_EMAIL || 'admin@dumarreco.tech'

const remoteDir = '/var/www/controle-financeiro'

const cmds = [
  'echo "=== UFW (servidor) ==="',
  'export DEBIAN_FRONTEND=noninteractive',
  'command -v ufw >/dev/null || (apt-get update -qq && apt-get install -y -qq ufw)',
  'ufw allow 22/tcp',
  'ufw allow 80/tcp',
  'ufw allow 443/tcp',
  'ufw --force enable || true',
  'ufw status numbered || true',
  'echo "=== Painel Hostinger: em Segurança > Firewall, crie regras TCP 22, 80 e 443 se a rede bloquear ==="',
  'echo "=== Git pull ==="',
  `cd ${remoteDir} && git pull origin main`,
  'echo "=== Docker: rebuild ==="',
  `cd ${remoteDir} && docker compose --env-file .env.docker up -d --build`,
  'echo "=== Aguardando stack (30s) ==="',
  'sleep 30',
  `echo "=== Let Encrypt (email: ${certEmail}) ==="`,
  `cd ${remoteDir} && docker compose --env-file .env.docker --profile cert run --rm certbot certonly --webroot -w /var/www/certbot -d dumarreco.tech --email ${certEmail} --agree-tos --non-interactive || echo "Certbot: verifique DNS, rate limit ou certificado já emitido."`,
  `cd ${remoteDir} && docker compose --env-file .env.docker up -d --force-recreate web`,
  'sleep 8',
  'echo "=== Containers ==="',
  'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
  'echo "=== API health ==="',
  'curl -s http://127.0.0.1:3333/health || echo "API?"',
  'echo "=== HTTP local ==="',
  'curl -sI http://127.0.0.1/ | head -8',
  'echo "=== HTTPS local (ignora certificado) ==="',
  'curl -skI https://127.0.0.1/ | head -8 || echo "HTTPS ainda não (normal antes do cert)"',
  'echo "=== API logs (tail) ==="',
  'docker logs dumarreco_api --tail 20 2>&1',
]

const c = new Client()
let i = 0

function run() {
  if (i >= cmds.length) {
    console.log('\n=== Deploy complete! ===')
    c.end()
    return
  }
  const cmd = cmds[i++]
  console.log('\n>>> ' + cmd)
  c.exec(cmd, (err, stream) => {
    if (err) {
      console.error('exec error:', err.message)
      run()
      return
    }
    stream.on('data', (d) => process.stdout.write(d))
    stream.stderr.on('data', (d) => process.stderr.write(d))
    stream.on('close', () => run())
  })
}

c.on('ready', () => {
  console.log('SSH Connected to VPS!')
  run()
})
c.on('error', (e) => {
  console.error('SSH Error:', e.message)
  process.exit(1)
})
c.on('keyboard-interactive', (_name, _instr, _lang, prompts, finish) => {
  finish(Array(prompts.length).fill(password))
})

c.connect({
  host,
  port,
  username,
  password,
  tryKeyboard: true,
  readyTimeout: 60000,
})
