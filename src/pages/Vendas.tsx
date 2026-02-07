import { useState, useEffect } from 'react'
import type { Venda, FormaPagamentoVenda } from '../types'
import { storageVendas, storageContas, registrarVenda, atualizarVenda } from '../services/storage'
import { applyCurrencyMask, parseCurrencyFromInput, formatCurrencyForInput } from '../utils/currencyMask'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

const FORMAS: FormaPagamentoVenda[] = ['pix', 'dinheiro', 'debito', 'credito']

const emptyForm = {
  descricao: '',
  valor: '',
  formaPagamento: 'pix' as FormaPagamentoVenda,
  contaBancoId: '',
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [contas, setContas] = useState(storageContas.getAll().filter((c) => c.ativo))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setVendas(storageVendas.getAll())
    setContas(storageContas.getAll().filter((c) => c.ativo))
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (v: Venda) => {
    setEditingId(v.id)
    setForm({
      descricao: v.descricao,
      valor: formatCurrencyForInput(v.valor),
      formaPagamento: v.formaPagamento,
      contaBancoId: v.contaBancoId ?? '',
    })
    setModalOpen(true)
  }

  const exigeContaBanco = form.formaPagamento === 'pix' || form.formaPagamento === 'debito' || form.formaPagamento === 'credito'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseCurrencyFromInput(form.valor)
    if (!form.descricao.trim() || valor <= 0) return
    if (exigeContaBanco && !form.contaBancoId) {
      alert('Selecione a conta banco que recebeu o pagamento (PIX, débito e crédito).')
      return
    }
    const data = editingId ? (storageVendas.getById(editingId)?.data ?? new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10)
    const criadoEm = editingId ? (storageVendas.getById(editingId)?.criadoEm ?? new Date().toISOString()) : new Date().toISOString()
    const venda: Venda = {
      id: editingId ?? crypto.randomUUID(),
      descricao: form.descricao.trim(),
      valor,
      formaPagamento: form.formaPagamento,
      contaBancoId: exigeContaBanco ? form.contaBancoId : undefined,
      data,
      criadoEm,
    }
    if (editingId) {
      atualizarVenda(venda)
    } else {
      registrarVenda(venda)
    }
    setForm(emptyForm)
    setEditingId(null)
    setModalOpen(false)
    load()
  }

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const totaisPorForma = FORMAS.reduce((acc, forma) => {
    acc[forma] = vendas.filter((v) => v.formaPagamento === forma).reduce((s, v) => s + v.valor, 0)
    return acc
  }, {} as Record<FormaPagamentoVenda, number>)
  const totalGeral = vendas.reduce((s, v) => s + v.valor, 0)

  return (
    <>
      <h1 className="page-title">Controle de Vendas</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Registre vendas com a forma de pagamento: <strong>PIX</strong>, <strong>Dinheiro</strong>, <strong>Débito</strong> ou <strong>Crédito</strong>. Vendas em PIX, débito e crédito podem ser vinculadas a uma conta banco para atualizar o saldo.
      </p>
      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Nova venda
        </button>
      </div>

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div className="card-saldo">
          <h3>Total de vendas</h3>
          <div className="valor saldo-positivo">{formatMoney(totalGeral)}</div>
        </div>
        {FORMAS.map((forma) => (
          <div key={forma} className="card-saldo">
            <h3>{forma === 'pix' ? 'PIX' : forma === 'dinheiro' ? 'Dinheiro' : forma === 'debito' ? 'Débito' : 'Crédito'}</h3>
            <div className="valor">{formatMoney(totaisPorForma[forma])}</div>
          </div>
        ))}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Forma de pagamento</th>
              <th>Conta (PIX/Déb/Créd)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  Nenhuma venda registrada. Clique em &quot;Nova venda&quot; para começar.
                </td>
              </tr>
            )}
            {[...vendas].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((v) => (
              <tr key={v.id}>
                <td>{format(new Date(v.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                <td>{v.descricao}</td>
                <td>{formatMoney(v.valor)}</td>
                <td>
                  <span className="badge badge-info">
                    {v.formaPagamento === 'pix' ? 'PIX' : v.formaPagamento === 'dinheiro' ? 'Dinheiro' : v.formaPagamento === 'debito' ? 'Débito' : 'Crédito'}
                  </span>
                </td>
                <td>
                  {v.contaBancoId
                    ? contas.find((c) => c.id === v.contaBancoId)?.nome ?? '-'
                    : '-'}
                </td>
                <td>
                  <button type="button" className="btn btn-secondary" onClick={() => openEdit(v)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); setEditingId(null); setForm(emptyForm) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar venda' : 'Nova venda'}</h2>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Descrição</label>
                <input
                  required
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Venda produto X"
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
                />
              </div>
              <div className="form-group">
                <label>Forma de pagamento</label>
                <select
                  value={form.formaPagamento}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      formaPagamento: e.target.value as FormaPagamentoVenda,
                      contaBancoId: e.target.value === 'dinheiro' ? '' : f.contaBancoId,
                    }))
                  }
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              {exigeContaBanco && (
                <div className="form-group">
                  <label>Conta banco que recebeu (atualiza o saldo)</label>
                  <select
                    value={form.contaBancoId}
                    onChange={(e) => setForm((f) => ({ ...f, contaBancoId: e.target.value }))}
                    required={exigeContaBanco}
                  >
                    <option value="">Selecione a conta</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} — {c.banco}
                      </option>
                    ))}
                  </select>
                  {contas.length === 0 && (
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--warning)' }}>
                      Cadastre uma conta banco em &quot;Conta Banco&quot; para vincular.
                    </p>
                  )}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditingId(null); setForm(emptyForm) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Registrar venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
