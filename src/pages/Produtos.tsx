import { useEffect, useState } from 'react'
import { productsGateway, type Product } from '../services/productsGateway'
import { applyCurrencyMask, parseCurrencyFromInput, formatCurrencyForInput } from '../utils/currencyMask'

function toNumber(v: string | number) {
  return typeof v === 'number' ? v : Number(v)
}

export default function Produtos() {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    description: '',
    unit: 'UN',
    priceInstallment: '',
    stockBalance: '0',
    isActive: true,
  })

  async function load() {
    setLoading(true)
    try {
      setFeedback('')
      const data = await productsGateway.list(search, 1, 200)
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setItems([])
      setFeedback(err instanceof Error ? err.message : 'Falha ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditingId(null)
    setForm({ code: '', description: '', unit: 'UN', priceInstallment: '', stockBalance: '0', isActive: true })
    document.getElementById('form-produto')?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    void load()
  }, [])

  async function save() {
    if (!form.code.trim()) {
      setFeedback('Informe o código do produto.')
      return
    }
    if (!form.description.trim()) {
      setFeedback('Informe a descrição do produto.')
      return
    }
    const price = parseCurrencyFromInput(form.priceInstallment)
    const stock = Number(form.stockBalance)
    if (price < 0) {
      setFeedback('Informe um preço válido (número maior ou igual a zero).')
      return
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setFeedback('Informe um saldo de estoque válido (número maior ou igual a zero).')
      return
    }
    try {
      setFeedback('')
      const payload = {
        code: form.code,
        description: form.description,
        unit: form.unit,
        priceInstallment: price,
        stockBalance: stock,
        isActive: form.isActive,
      }
      if (editingId) {
        await productsGateway.update(editingId, payload)
        setFeedback('Produto atualizado.')
      } else {
        await productsGateway.create(payload)
        setFeedback('Produto criado.')
      }
      setEditingId(null)
      setForm({ code: '', description: '', unit: 'UN', priceInstallment: '', stockBalance: '0', isActive: true })
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Falha ao salvar produto.')
    }
  }

  async function toggle(item: Product) {
    try {
      setFeedback('')
      await productsGateway.activate(item.id, !item.isActive)
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Falha ao atualizar status do produto.')
    }
  }

  function exportCsv() {
    const rows = [
      ['codigo_do_produto', 'descricao_do_produto', 'preco_a_prazo', 'saldo_estoque', 'status'],
      ...items.map((i) => [
        i.code,
        i.description,
        String(toNumber(i.priceInstallment).toFixed(2)),
        String(toNumber(i.stockBalance).toFixed(3)),
        i.isActive ? 'ativo' : 'inativo',
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'produtos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <h1 className="page-title">Cadastros - Produtos</h1>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Visualizador de produtos</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Buscar por código ou nome</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Código ou nome do produto"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={openNew}>Novo produto</button>
          <button className="btn btn-secondary" onClick={() => load()}>Buscar</button>
          <button className="btn btn-secondary" onClick={exportCsv}>Exportar CSV</button>
          {!loading && (
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {total} produto(s) encontrado(s)
            </span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Descricao</th>
                <th>Preco a prazo</th>
                <th>Saldo estoque</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.description}</td>
                  <td>R$ {toNumber(item.priceInstallment).toFixed(2)}</td>
                  <td>{toNumber(item.stockBalance).toFixed(3)}</td>
                  <td>{item.isActive ? 'Ativo' : 'Inativo'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(item.id)
                        setForm({
                          code: item.code,
                          description: item.description,
                          unit: item.unit ?? 'UN',
                          priceInstallment: formatCurrencyForInput(toNumber(item.priceInstallment)),
                          stockBalance: String(item.stockBalance),
                          isActive: item.isActive,
                        })
                      }}
                    >
                      Editar
                    </button>
                    <button className="btn btn-secondary" onClick={() => toggle(item)}>
                      {item.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" id="form-produto">
        <h2 style={{ marginBottom: 16 }}>{editingId ? 'Editar produto' : 'Novo produto'}</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Codigo</label>
            <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Descricao</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Unidade</label>
            <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Preco a prazo</label>
            <input
              value={form.priceInstallment}
              onChange={(e) => setForm((p) => ({ ...p, priceInstallment: applyCurrencyMask(e.target.value) }))}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </div>
          <div className="form-group">
            <label>Saldo estoque</label>
            <input value={form.stockBalance} onChange={(e) => setForm((p) => ({ ...p, stockBalance: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={save}>{editingId ? 'Salvar' : 'Cadastrar'}</button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setEditingId(null)
              setForm({ code: '', description: '', unit: 'UN', priceInstallment: '', stockBalance: '0', isActive: true })
            }}
          >
            Limpar
          </button>
        </div>
        {feedback ? <p style={{ marginTop: 12 }}>{feedback}</p> : null}
      </div>
    </section>
  )
}
