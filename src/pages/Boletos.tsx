import { useState, useEffect } from 'react'
import type { Boleto } from '../types'
import { storageBoletos } from '../services/storage'
import { applyCurrencyMask, parseCurrencyFromInput, formatCurrencyForInput } from '../utils/currencyMask'
import { formatDateBR } from '../utils/date'

export default function Boletos() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ descricao: '', valor: '', vencimento: '' })
  const [modalParceladoOpen, setModalParceladoOpen] = useState(false)
  const [formParcelado, setFormParcelado] = useState({ descricao: '', valor: '', parcelas: 2, vencimento: '' })

  const load = () => {
    setBoletos(storageBoletos.getAll())
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ descricao: '', valor: '', vencimento: '' })
    setModalOpen(true)
  }

  const openEdit = (b: Boleto) => {
    setEditingId(b.id)
    setForm({
      descricao: b.descricao,
      valor: formatCurrencyForInput(b.valor),
      vencimento: b.vencimento || '',
    })
    setModalOpen(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseCurrencyFromInput(form.valor)
    if (!form.descricao.trim()) return
    const vencimento = form.vencimento || new Date().toISOString().slice(0, 10)
    if (editingId) {
      const existente = storageBoletos.getById(editingId)
      if (existente) {
        const valorFinal = existente.pago ? existente.valor : (valor <= 0 ? existente.valor : valor)
        if (!existente.pago && valor <= 0) return
        storageBoletos.save({
          ...existente,
          descricao: form.descricao.trim(),
          valor: valorFinal,
          vencimento,
        })
      }
    } else {
      if (valor <= 0) return
      storageBoletos.save({
        id: crypto.randomUUID(),
        descricao: form.descricao.trim(),
        valor,
        vencimento,
        pago: false,
        criadoEm: new Date().toISOString(),
      })
    }
    setForm({ descricao: '', valor: '', vencimento: '' })
    setEditingId(null)
    setModalOpen(false)
    load()
  }

  const submitParcelado = (e: React.FormEvent) => {
    e.preventDefault()
    const valorTotal = parseCurrencyFromInput(formParcelado.valor)
    const parcelas = Math.min(24, Math.max(2, formParcelado.parcelas))
    if (!formParcelado.descricao.trim() || valorTotal <= 0) return
    const valorParcela = valorTotal / parcelas
    const baseDate = formParcelado.vencimento || new Date().toISOString().slice(0, 10)
    const dt = new Date(baseDate + 'T12:00:00')
    for (let i = 0; i < parcelas; i++) {
      const venc = new Date(dt)
      venc.setMonth(venc.getMonth() + i)
      const vencStr = venc.toISOString().slice(0, 10)
      storageBoletos.save({
        id: crypto.randomUUID(),
        descricao: `${formParcelado.descricao.trim()} (${i + 1}/${parcelas} - Cartão crédito)`,
        valor: Math.round(valorParcela * 100) / 100,
        vencimento: vencStr,
        pago: false,
        criadoEm: new Date().toISOString(),
      })
    }
    setFormParcelado({ descricao: '', valor: '', parcelas: 2, vencimento: '' })
    setModalParceladoOpen(false)
    load()
  }

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const pendentes = boletos.filter((b) => !b.pago)
  const pagos = boletos.filter((b) => b.pago)

  return (
    <>
      <h1 className="page-title">Boletos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        A importacao de XML de NFe foi movida para o modulo <strong>Compras</strong>. Nesta tela ficam os lancamentos e parcelamentos de contas a pagar.
      </p>
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Novo boleto
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setModalParceladoOpen(true)}>
          Parcelado (cartão crédito)
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Pendentes</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendentes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--text-muted)', padding: 16 }}>
                    Nenhum boleto pendente.
                  </td>
                </tr>
              )}
              {pendentes.map((b) => (
                <tr key={b.id}>
                  <td>{b.descricao}</td>
                  <td>{formatMoney(b.valor)}</td>
                  <td>{formatDateBR(b.vencimento)}</td>
                  <td><span className="badge badge-warning">Pendente</span></td>
                  <td>
                    <button type="button" className="btn btn-secondary" onClick={() => openEdit(b)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Pagos</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Data pagamento</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--text-muted)', padding: 16 }}>
                    Nenhum boleto pago.
                  </td>
                </tr>
              )}
              {pagos.map((b) => (
                <tr key={b.id}>
                  <td>{b.descricao}</td>
                  <td>{formatMoney(b.valor)}</td>
                  <td>{formatDateBR(b.dataPagamento)}</td>
                  <td>
                    {b.origemPagamento === 'conta_banco' ? 'Conta banco' : b.origemPagamento === 'dinheiro' ? 'Dinheiro' : '-'}
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary" onClick={() => openEdit(b)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); setEditingId(null); setForm({ descricao: '', valor: '', vencimento: '' }) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar boleto' : 'Novo boleto'}</h2>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Descrição</label>
                <input
                  required
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Conta de luz"
                />
              </div>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input
                  required
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: applyCurrencyMask(e.target.value) }))}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                  readOnly={!!editingId && !!storageBoletos.getById(editingId || '')?.pago}
                />
                {editingId && storageBoletos.getById(editingId || '')?.pago && (
                  <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Valor não pode ser alterado em boletos já pagos.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Vencimento</label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditingId(null); setForm({ descricao: '', valor: '', vencimento: '' }) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalParceladoOpen && (
        <div className="modal-overlay" onClick={() => { setModalParceladoOpen(false); setFormParcelado({ descricao: '', valor: '', parcelas: 2, vencimento: '' }) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Boleto parcelado (cartão de crédito)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
              Cria múltiplos boletos (um por parcela) com o valor dividido. O primeiro vencimento é da data informada; as demais parcelas vencem mensalmente.
            </p>
            <form onSubmit={submitParcelado}>
              <div className="form-group">
                <label>Descrição</label>
                <input
                  required
                  value={formParcelado.descricao}
                  onChange={(e) => setFormParcelado((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Compra cartão crédito"
                />
              </div>
              <div className="form-group">
                <label>Valor total (R$)</label>
                <input
                  required
                  value={formParcelado.valor}
                  onChange={(e) => setFormParcelado((f) => ({ ...f, valor: applyCurrencyMask(e.target.value) }))}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                />
              </div>
              <div className="form-group">
                <label>Número de parcelas</label>
                <input
                  type="number"
                  min={2}
                  max={24}
                  value={formParcelado.parcelas}
                  onChange={(e) => setFormParcelado((f) => ({ ...f, parcelas: Math.min(24, Math.max(2, parseInt(e.target.value, 10) || 2)) }))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                  (2 a 24 parcelas)
                </span>
              </div>
              <div className="form-group">
                <label>Vencimento da 1ª parcela</label>
                <input
                  type="date"
                  value={formParcelado.vencimento}
                  onChange={(e) => setFormParcelado((f) => ({ ...f, vencimento: e.target.value }))}
                />
              </div>
              {formParcelado.valor && formParcelado.parcelas >= 2 && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Valor por parcela: {formatMoney(parseCurrencyFromInput(formParcelado.valor) / formParcelado.parcelas)}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setModalParceladoOpen(false); setFormParcelado({ descricao: '', valor: '', parcelas: 2, vencimento: '' }) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar {formParcelado.parcelas} parcelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
