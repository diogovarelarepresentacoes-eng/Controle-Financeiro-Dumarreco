/**
 * Deploy na VPS: atualiza o repositório em /var/www/controle-financeiro e sobe os containers.
 *
 * Uso (PowerShell): $env:SSH_PASSWORD='sua_senha'; node deploy-vps.cjs
 * Uso (bash): SSH_PASSWORD='sua_senha' node deploy-vps.cjs
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

const cmds = [
  'echo "=== Git pull ==="',
  'cd /var/www/controle-financeiro && git pull origin main',
  'echo "=== Stopping old containers ==="',
  'docker stop dumarreco_web dumarreco_api dumarreco_db 2>/dev/null; docker rm dumarreco_web dumarreco_api dumarreco_db 2>/dev/null; echo "Old containers removed"',
  'echo "=== Starting fresh containers ==="',
  'cd /var/www/controle-financeiro && docker compose --env-file .env.docker up -d --build',
  'echo "=== Waiting for DB healthy + API start (50s) ==="',
  'sleep 50',
  'echo "=== Container status ==="',
  'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
  'echo "=== API health check ==="',
  'curl -s http://127.0.0.1:3333/health || echo "API not responding"',
  'echo "=== API logs (last 30 lines) ==="',
  'docker logs dumarreco_api --tail 30 2>&1',
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
  readyTimeout: 30000,
})
