import { useState, useEffect } from 'react'
import { taxasCartaoGateway, type TaxaCartao } from '../services/taxasCartaoGateway'

const emptyForm = {
  descricao: '',
  tipoCartao: 'credito' as 'debito' | 'credito',
  quantidadeParcelas: 1,
  taxaPercentual: '',
}

export default function ConfiguracoesTaxasCartao() {
  const [taxas, setTaxas] = useState<TaxaCartao[]>([])
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'debito' | 'credito'>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [erro, setErro] = useState('')

  const load = async () => {
    const tipo = filtroTipo === 'todas' ? undefined : filtroTipo
    const lista = await taxasCartaoGateway.list({ tipo })
    setTaxas(lista)
  }

  useEffect(() => {
    load()
  }, [filtroTipo])

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErro('')
    setModalOpen(true)
  }

  const openEdit = (t: TaxaCartao) => {
    setEditingId(t.id)
    setForm({
      descricao: t.descricao,
      tipoCartao: t.tipoCartao,
      quantidadeParcelas: t.quantidadeParcelas,
      taxaPercentual: String(t.taxaPercentual),
    })
    setErro('')
    setModalOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    const taxa = parseFloat(form.taxaPercentual.replace(',', '.'))
    if (isNaN(taxa) || taxa < 0) {
      setErro('Taxa não pode ser negativa.')
      return
    }
    if (form.tipoCartao === 'debito' && form.quantidadeParcelas !== 1) {
      setErro('Débito deve ter sempre 1 parcela.')
      return
    }
    if (form.quantidadeParcelas < 1 || form.quantidadeParcelas > 12) {
      setErro('Parcelas devem ser entre 1 e 12.')
      return
    }
    try {
      if (editingId) {
        await taxasCartaoGateway.update(editingId, {
          descricao: form.descricao,
          tipoCartao: form.tipoCartao,
          quantidadeParcelas: form.quantidadeParcelas,
          taxaPercentual: taxa,
        })
      } else {
        await taxasCartaoGateway.create({
          descricao: form.descricao,
          tipoCartao: form.tipoCartao,
          quantidadeParcelas: form.quantidadeParcelas,
          taxaPercentual: taxa,
        })
      }
      setForm(emptyForm)
      setEditingId(null)
      setModalOpen(false)
      load()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  const toggleAtivo = async (id: string) => {
    try {
      await taxasCartaoGateway.toggleAtivo(id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar status.')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir esta taxa?')) return
    try {
      await taxasCartaoGateway.remove(id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  const taxasFiltradas = taxas

  return (
    <div>
      <h1 className="page-title">Taxas de Cartão</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Configure as taxas percentuais aplicadas às vendas em cartão (débito e crédito parcelado). O valor líquido (após a taxa) é o que entra no financeiro.
      </p>

      <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Nova taxa
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem' }}>Filtrar:</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as 'todas' | 'debito' | 'credito')}
            className="form-control"
            style={{ width: 'auto' }}
          >
            <option value="todas">Todas</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Parcelas</th>
              <th>Taxa %</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {taxasFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  Nenhuma taxa cadastrada. Clique em &quot;Nova taxa&quot; ou use as taxas padrão (são criadas automaticamente ao usar vendas em cartão).
                </td>
              </tr>
            )}
            {taxasFiltradas.map((t) => (
              <tr key={t.id}>
                <td>{t.descricao}</td>
                <td>
                  <span className="badge badge-info">{t.tipoCartao === 'debito' ? 'Débito' : 'Crédito'}</span>
                </td>
                <td>{t.quantidadeParcelas}x</td>
                <td>{t.taxaPercentual.toFixed(2)}%</td>
                <td>
                  <span className={t.ativo ? 'badge badge-success' : 'badge badge-secondary'}>
                    {t.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <button type="button" className="btn btn-secondary" onClick={() => openEdit(t)} style={{ marginRight: 8 }}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => toggleAtivo(t.id)}
                    style={{ marginRight: 8 }}
                  >
                    {t.ativo ? 'Inativar' : 'Ativar'}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => remove(t.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); setEditingId(null); setForm(emptyForm); setErro('') }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar taxa' : 'Nova taxa'}</h2>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Descrição</label>
                <input
                  required
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Crédito 3x"
                />
              </div>
              <div className="form-group">
                <label>Tipo de cartão</label>
                <select
                  value={form.tipoCartao}
                  onChange={(e) => {
                    const tipo = e.target.value as 'debito' | 'credito'
                    setForm((f) => ({
                      ...f,
                      tipoCartao: tipo,
                      quantidadeParcelas: tipo === 'debito' ? 1 : f.quantidadeParcelas,
                    }))
                  }}
                >
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantidade de parcelas</label>
                <select
                  value={form.quantidadeParcelas}
                  onChange={(e) => setForm((f) => ({ ...f, quantidadeParcelas: Number(e.target.value) }))}
                  disabled={form.tipoCartao === 'debito'}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
                {form.tipoCartao === 'debito' && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Débito sempre 1 parcela.</p>
                )}
              </div>
              <div className="form-group">
                <label>Taxa percentual (%)</label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={form.taxaPercentual}
                  onChange={(e) => setForm((f) => ({ ...f, taxaPercentual: e.target.value.replace(/[^\d,.]/g, '') }))}
                  placeholder="Ex: 3,99"
                />
              </div>
              {erro && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: 12 }}>{erro}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditingId(null); setForm(emptyForm); setErro('') }}>
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
    </div>
  )
}
