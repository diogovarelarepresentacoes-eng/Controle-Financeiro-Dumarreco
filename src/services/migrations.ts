type MigrationFn = () => void

const KEY_SCHEMA_VERSION = 'controle-financeiro-schema-version'
const KEY_BOLETOS = 'controle-financeiro-boletos'
const KEY_COMPRAS = 'controle-financeiro-compras'
const KEY_COMPRAS_ITENS = 'controle-financeiro-compras-itens'
const KEY_COMPRAS_DOCUMENTOS = 'controle-financeiro-compras-documentos'
const KEY_FORNECEDORES = 'controle-financeiro-fornecedores'
const KEY_IMPORT_LOGS = 'controle-financeiro-importacao-xml-logs'

function getVersion(): number {
  const raw = localStorage.getItem(KEY_SCHEMA_VERSION)
  const v = Number(raw ?? '1')
  return Number.isFinite(v) && v > 0 ? v : 1
}

function setVersion(v: number) {
  localStorage.setItem(KEY_SCHEMA_VERSION, String(v))
}

function ensureArrayKey(key: string) {
  const raw = localStorage.getItem(key)
  if (!raw) {
    localStorage.setItem(key, JSON.stringify([]))
    return
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) localStorage.setItem(key, JSON.stringify([]))
  } catch {
    localStorage.setItem(key, JSON.stringify([]))
  }
}

const migrations: Record<number, MigrationFn> = {
  2: () => {
    // Inicializa estruturas do modulo de compras sem tocar nos dados existentes.
    ensureArrayKey(KEY_COMPRAS)
    ensureArrayKey(KEY_COMPRAS_ITENS)
    ensureArrayKey(KEY_COMPRAS_DOCUMENTOS)
    ensureArrayKey(KEY_FORNECEDORES)
    ensureArrayKey(KEY_IMPORT_LOGS)

    // Migra boletos para suportar compraId sem quebrar registros antigos.
    const raw = localStorage.getItem(KEY_BOLETOS)
    if (!raw) return
    try {
      const boletos = JSON.parse(raw)
      if (!Array.isArray(boletos)) return
      const migrated = boletos.map((b) => ({ ...b, compraId: b.compraId ?? undefined }))
      localStorage.setItem(KEY_BOLETOS, JSON.stringify(migrated))
    } catch {
      // no-op para preservar operacao em dados corrompidos
    }
  },
}

export function runStorageMigrations() {
  let version = getVersion()
  const latest = Math.max(...Object.keys(migrations).map((k) => Number(k)))
  while (version < latest) {
    const next = version + 1
    migrations[next]?.()
    setVersion(next)
    version = next
  }
}
