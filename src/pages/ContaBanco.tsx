import { useState, useEffect } from 'react'
import type { ContaBanco as ContaBancoType, FormaPagamento } from '../types'
import { storageContas } from '../services/storage'
import { applyCurrencyMask, parseCurrencyFromInput } from '../utils/currencyMask'

const FORMAS: FormaPagamento[] = ['pix', 'debito', 'credito']

const emptyForm: Omit<ContaBancoType, 'id' | 'criadoEm'> = {
  nome: '',
  banco: '',
  agencia: '',
  conta: '',
  saldoInicial: 0,
  saldoAtual: 0,
  formasAceitas: [],
  ativo: true,
}

export default function ContaBanco() {
  const [contas, setContas] = useState<ContaBancoType[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => setContas(storageContas.getAll())

  useEffect(() => {
    load()
  }, [])

  const [saldoInicialDisplay, setSaldoInicialDisplay] = useState('')

  const openNew = () => {
    setEditingId(null)
    setForm({ ...emptyForm, saldoInicial: 0, saldoAtual: 0 })
    setSaldoInicialDisplay('')
    setModalOpen(true)
  }

  const openEdit = (c: ContaBancoType) => {
    setEditingId(c.id)
    setForm({
      nome: c.nome,
      banco: c.banco,
      agencia: c.agencia,
      conta: c.conta,
      saldoInicial: c.saldoInicial,
      saldoAtual: c.saldoAtual,
      formasAceitas: [...c.formasAceitas],
      ativo: c.ativo,
    })
    setModalOpen(true)
  }

  const toggleForma = (forma: FormaPagamento) => {
    setForm((f) => ({
      ...f,
      formasAceitas: f.formasAceitas.includes(forma)
        ? f.formasAceitas.filter((x) => x !== forma)
        : [...f.formasAceitas, forma],
    }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const agora = new Date().toISOString()
    if (editingId) {
      const existente = contas.find((c) => c.id === editingId)!
      storageContas.save({
        ...existente,
        ...form,
        saldoAtual: existente.saldoAtual,
      })
    } else {
      const saldoInicial = parseCurrencyFromInput(saldoInicialDisplay)
      storageContas.save({
        id: crypto.randomUUID(),
        ...form,
        saldoInicial,
        saldoAtual: saldoInicial,
        criadoEm: agora,
      })
    }
    setModalOpen(false)
    load()
  }

  const remove = (id: string) => {
    if (window.confirm('Excluir esta conta?')) {
      storageContas.delete(id)
      load()
    }
  }

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <>
      <h1 className="page-title">Conta Banco</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Cadastre os bancos para pagamentos via PIX, débito e crédito. Defina o saldo inicial da conta.
      </p>
      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Nova conta
        </button>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome / Banco</th>
              <th>Agência / Conta</th>
              <th>Formas</th>
              <th>Saldo inicial</th>
              <th>Saldo atual</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  Nenhuma conta cadastrada. Clique em &quot;Nova conta&quot; para começar.
                </td>
              </tr>
            )}
            {contas.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.nome}</strong>
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.banco}</span>
                </td>
                <td>{c.agencia} / {c.conta}</td>
                <td>
                  {c.formasAceitas.map((f) => (
                    <span key={f} className="badge badge-info" style={{ marginRight: 4 }}>
                      {f.toUpperCase()}
                    </span>
                  ))}
                </td>
                <td>{formatMoney(c.saldoInicial)}</td>
                <td className={c.saldoAtual >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>
                  {formatMoney(c.saldoAtual)}
                </td>
                <td>{c.ativo ? <span className="badge badge-success">Ativo</span> : <span className="badge badge-warning">Inativo</span>}</td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: 8 }} onClick={() => openEdit(c)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => remove(c.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar conta' : 'Nova conta banco'}</h2>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Nome da conta (ex: Conta Corrente Principal)</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Conta Corrente"
                />
              </div>
              <div className="form-group">
                <label>Banco</label>
                <input
                  required
                  value={form.banco}
                  onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                  placeholder="Ex: Nubank, Itaú"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Agência</label>
                  <input
                    value={form.agencia}
                    onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))}
                    placeholder="0000"
                  />
                </div>
                <div className="form-group">
                  <label>Conta</label>
                  <input
                    value={form.conta}
                    onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))}
                    placeholder="12345-6"
                  />
                </div>
              </div>
              {!editingId && (
                <div className="form-group">
                  <label>Saldo inicial (R$)</label>
                  <input
                    value={saldoInicialDisplay}
                    onChange={(e) => setSaldoInicialDisplay(applyCurrencyMask(e.target.value))}
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Formas de pagamento aceitas</label>
                <div className="checkbox-group">
                  {FORMAS.map((forma) => (
                    <label key={forma}>
                      <input
                        type="checkbox"
                        checked={form.formasAceitas.includes(forma)}
                        onChange={() => toggleForma(forma)}
                      />
                      {forma.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              {editingId && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                    />
                    {' '}Conta ativa
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
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
    </>
  )
}
