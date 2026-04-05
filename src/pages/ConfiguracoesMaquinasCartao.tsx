import { useState, useEffect } from 'react'
import {
  maquinasCartaoGateway,
  type MaquinaCartao,
  type TaxaMaquinaCartao,
} from '../services/maquinasCartaoGateway'
import { vendasGateway } from '../services/vendasGateway'
import { MODALIDADES_CARTAO } from '../utils/constants'

const emptyFormMaquina = {
  nome: '',
  adquirente: '',
  descricao: '',
}

const emptyFormTaxa = {
  tipoCartao: 'credito' as 'debito' | 'credito',
  parcelas: 1,
  taxaPercentual: '',
}

function labelModalidade(t: TaxaMaquinaCartao) {
  return MODALIDADES_CARTAO.find((m) => m.tipo === t.tipoCartao && m.parcelas === t.parcelas)?.label ?? `${t.tipoCartao} ${t.parcelas}x`
}

export default function ConfiguracoesMaquinasCartao() {
  const [maquinas, setMaquinas] = useState<MaquinaCartao[]>([])
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<MaquinaCartao | null>(null)
  const [taxas, setTaxas] = useState<TaxaMaquinaCartao[]>([])
  const [modalMaquinaOpen, setModalMaquinaOpen] = useState(false)
  const [modalTaxaOpen, setModalTaxaOpen] = useState(false)
  const [editingMaquinaId, setEditingMaquinaId] = useState<string | null>(null)
  const [editingTaxaId, setEditingTaxaId] = useState<string | null>(null)
  const [formMaquina, setFormMaquina] = useState(emptyFormMaquina)
  const [formTaxa, setFormTaxa] = useState(emptyFormTaxa)
  const [erro, setErro] = useState('')

  const loadMaquinas = async () => {
    const lista = await maquinasCartaoGateway.list()
    setMaquinas(lista)
  }

  const loadTaxas = async (maquinaId: string) => {
    const lista = await maquinasCartaoGateway.listTaxas(maquinaId)
    setTaxas(lista)
  }

  useEffect(() => {
    loadMaquinas()
  }, [])

  useEffect(() => {
    if (maquinaSelecionada) {
      loadTaxas(maquinaSelecionada.id)
    } else {
      setTaxas([])
    }
  }, [maquinaSelecionada?.id])

  const openNewMaquina = () => {
    setEditingMaquinaId(null)
    setFormMaquina(emptyFormMaquina)
    setErro('')
    setModalMaquinaOpen(true)
  }

  const openEditMaquina = (m: MaquinaCartao) => {
    setEditingMaquinaId(m.id)
    setFormMaquina({
      nome: m.nome,
      adquirente: m.adquirente,
      descricao: m.descricao ?? '',
    })
    setErro('')
    setModalMaquinaOpen(true)
  }

  const submitMaquina = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!formMaquina.nome.trim() || !formMaquina.adquirente.trim()) {
      setErro('Nome e adquirente são obrigatórios.')
      return
    }
    try {
      if (editingMaquinaId) {
        await maquinasCartaoGateway.updateMaquina(editingMaquinaId, {
          nome: formMaquina.nome.trim(),
          adquirente: formMaquina.adquirente.trim(),
          descricao: formMaquina.descricao.trim() || undefined,
        })
      } else {
        await maquinasCartaoGateway.createMaquina({
          nome: formMaquina.nome.trim(),
          adquirente: formMaquina.adquirente.trim(),
          descricao: formMaquina.descricao.trim() || undefined,
        })
      }
      setFormMaquina(emptyFormMaquina)
      setEditingMaquinaId(null)
      setModalMaquinaOpen(false)
      loadMaquinas()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  const toggleAtivoMaquina = async (m: MaquinaCartao) => {
    try {
      await maquinasCartaoGateway.toggleAtivo(m.id)
      loadMaquinas()
      if (maquinaSelecionada?.id === m.id) {
        setMaquinaSelecionada(null)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar status.')
    }
  }

  const removeMaquina = async (m: MaquinaCartao) => {
    const todasVendas = await vendasGateway.getAll()
    const vendasComMaquina = todasVendas.filter((v) => v.maquinaCartaoId === m.id)
    if (vendasComMaquina.length > 0) {
      alert(`Não é possível excluir. Existem ${vendasComMaquina.length} venda(s) vinculada(s) a esta máquina.`)
      return
    }
    if (!confirm(`Excluir a máquina "${m.nome}"? As taxas serão removidas.`)) return
    try {
      await maquinasCartaoGateway.removeMaquina(m.id)
      loadMaquinas()
      if (maquinaSelecionada?.id === m.id) {
        setMaquinaSelecionada(null)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  const openNewTaxa = () => {
    if (!maquinaSelecionada) return
    setEditingTaxaId(null)
    setFormTaxa(emptyFormTaxa)
    setErro('')
    setModalTaxaOpen(true)
  }

  const openEditTaxa = (t: TaxaMaquinaCartao) => {
    setEditingTaxaId(t.id)
    setFormTaxa({
      tipoCartao: t.tipoCartao,
      parcelas: t.parcelas,
      taxaPercentual: String(t.taxaPercentual),
    })
    setErro('')
    setModalTaxaOpen(true)
  }

  const submitTaxa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maquinaSelecionada) return
    setErro('')
    const taxa = parseFloat(formTaxa.taxaPercentual.replace(',', '.'))
    if (isNaN(taxa) || taxa < 0) {
      setErro('Taxa não pode ser negativa.')
      return
    }
    if (formTaxa.tipoCartao === 'debito' && formTaxa.parcelas !== 1) {
      setErro('Débito deve ter sempre 1 parcela.')
      return
    }
    if (formTaxa.parcelas < 1 || formTaxa.parcelas > 12) {
      setErro('Parcelas devem ser entre 1 e 12.')
      return
    }
    try {
      if (editingTaxaId) {
        await maquinasCartaoGateway.updateTaxa(maquinaSelecionada.id, editingTaxaId, {
          tipoCartao: formTaxa.tipoCartao,
          parcelas: formTaxa.parcelas,
          taxaPercentual: taxa,
        })
      } else {
        await maquinasCartaoGateway.createTaxa(maquinaSelecionada.id, {
          tipoCartao: formTaxa.tipoCartao,
          parcelas: formTaxa.parcelas,
          taxaPercentual: taxa,
        })
      }
      setFormTaxa(emptyFormTaxa)
      setEditingTaxaId(null)
      setModalTaxaOpen(false)
      loadTaxas(maquinaSelecionada.id)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  const removeTaxa = async (t: TaxaMaquinaCartao) => {
    if (!maquinaSelecionada) return
    if (!confirm('Excluir esta taxa?')) return
    try {
      await maquinasCartaoGateway.removeTaxa(maquinaSelecionada.id, t.id)
      loadTaxas(maquinaSelecionada.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  return (
    <div>
      <h1 className="page-title">Máquinas de Cartão</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Cadastre as máquinas de cartão (adquirentes) e configure as taxas por modalidade. Cada máquina pode ter taxas diferentes para débito e crédito parcelado.
      </p>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Máquinas</h2>
        <div style={{ marginBottom: 16 }}>
          <button type="button" className="btn btn-primary" onClick={openNewMaquina}>
            Nova máquina
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Adquirente</th>
                <th>Descrição</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {maquinas.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhuma máquina cadastrada. Clique em &quot;Nova máquina&quot; para começar.
                  </td>
                </tr>
              )}
              {maquinas.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome}</td>
                  <td>{m.adquirente}</td>
                  <td>{m.descricao ?? '-'}</td>
                  <td>
                    <span className={m.ativo ? 'badge badge-success' : 'badge badge-secondary'}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setMaquinaSelecionada(m)}
                      style={{ marginRight: 8 }}
                    >
                      Configurar taxas
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openEditMaquina(m)}
                      style={{ marginRight: 8 }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => toggleAtivoMaquina(m)}
                      style={{ marginRight: 8 }}
                    >
                      {m.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => removeMaquina(m)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {maquinaSelecionada && (
        <section className="card">
          <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>
            Taxas — {maquinaSelecionada.nome}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
            Configure as taxas percentuais para cada modalidade de pagamento nesta máquina.
          </p>
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openNewTaxa}
            >
              Nova taxa
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMaquinaSelecionada(null)}
              style={{ marginLeft: 8 }}
            >
              Voltar
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Modalidade</th>
                  <th>Taxa %</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {taxas.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                      Nenhuma taxa configurada. Clique em &quot;Nova taxa&quot; para adicionar.
                    </td>
                  </tr>
                )}
                {taxas.map((t) => (
                  <tr key={t.id}>
                    <td>{labelModalidade(t)}</td>
                    <td>{t.taxaPercentual.toFixed(2)}%</td>
                    <td>
                      <span className={t.ativo ? 'badge badge-success' : 'badge badge-secondary'}>
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openEditTaxa(t)}
                        style={{ marginRight: 8 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeTaxa(t)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modalMaquinaOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setModalMaquinaOpen(false)
            setEditingMaquinaId(null)
            setFormMaquina(emptyFormMaquina)
            setErro('')
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingMaquinaId ? 'Editar máquina' : 'Nova máquina'}</h2>
            <form onSubmit={submitMaquina}>
              <div className="form-group">
                <label>Nome</label>
                <input
                  required
                  value={formMaquina.nome}
                  onChange={(e) => setFormMaquina((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Stone Loja 1"
                />
              </div>
              <div className="form-group">
                <label>Adquirente</label>
                <input
                  required
                  value={formMaquina.adquirente}
                  onChange={(e) => setFormMaquina((f) => ({ ...f, adquirente: e.target.value }))}
                  placeholder="Ex: Stone, Cielo, Rede"
                />
              </div>
              <div className="form-group">
                <label>Descrição (opcional)</label>
                <input
                  value={formMaquina.descricao}
                  onChange={(e) => setFormMaquina((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Máquina do caixa principal"
                />
              </div>
              {erro && (
                <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: 12 }}>{erro}</p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setModalMaquinaOpen(false)
                    setEditingMaquinaId(null)
                    setFormMaquina(emptyFormMaquina)
                    setErro('')
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMaquinaId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalTaxaOpen && maquinaSelecionada && (
        <div
          className="modal-overlay"
          onClick={() => {
            setModalTaxaOpen(false)
            setEditingTaxaId(null)
            setFormTaxa(emptyFormTaxa)
            setErro('')
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTaxaId ? 'Editar taxa' : 'Nova taxa'}</h2>
            <form onSubmit={submitTaxa}>
              <div className="form-group">
                <label>Tipo de cartão</label>
                <select
                  value={formTaxa.tipoCartao}
                  onChange={(e) => {
                    const tipo = e.target.value as 'debito' | 'credito'
                    setFormTaxa((f) => ({
                      ...f,
                      tipoCartao: tipo,
                      parcelas: tipo === 'debito' ? 1 : f.parcelas,
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
                  value={formTaxa.parcelas}
                  onChange={(e) => setFormTaxa((f) => ({ ...f, parcelas: Number(e.target.value) }))}
                  disabled={formTaxa.tipoCartao === 'debito'}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
                {formTaxa.tipoCartao === 'debito' && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Débito sempre 1 parcela.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Taxa percentual (%)</label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={formTaxa.taxaPercentual}
                  onChange={(e) =>
                    setFormTaxa((f) => ({
                      ...f,
                      taxaPercentual: e.target.value.replace(/[^\d,.]/g, ''),
                    }))
                  }
                  placeholder="Ex: 3,99"
                />
              </div>
              {erro && (
                <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: 12 }}>{erro}</p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setModalTaxaOpen(false)
                    setEditingTaxaId(null)
                    setFormTaxa(emptyFormTaxa)
                    setErro('')
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTaxaId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
