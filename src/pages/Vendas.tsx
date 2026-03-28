import { useState, useEffect, useMemo } from 'react'
import type { Venda, FormaPagamentoVenda } from '../types'
import { storageVendas, storageContas, registrarVenda, atualizarVenda, excluirVenda } from '../services/storage'
import { applyCurrencyMask, parseCurrencyFromInput, formatCurrencyForInput } from '../utils/currencyMask'
import { formatDateBR, parseDateOnly } from '../utils/date'
import { maquinasCartaoGateway } from '../services/maquinasCartaoGateway'
import { calcularValorLiquidoCartao } from '../services/taxaCartaoService'
import { formatMoney } from '../utils/formatMoney'
import { MODALIDADES_CARTAO } from '../utils/constants'

const FORMAS: FormaPagamentoVenda[] = ['pix', 'dinheiro', 'cartao']

const emptyForm = {
  descricao: '',
  valor: '',
  formaPagamento: 'pix' as FormaPagamentoVenda,
  maquinaCartaoId: '',
  modalidadeCartao: '',
  contaBancoId: '',
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [contas, setContas] = useState(storageContas.getAll().filter((c) => c.ativo))
  const [maquinas, setMaquinas] = useState<{ id: string; nome: string }[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [taxaConfigurada, setTaxaConfigurada] = useState<{ taxaPercentual: number } | null>(null)

  const load = () => {
    setVendas(storageVendas.getAll())
    setContas(storageContas.getAll().filter((c) => c.ativo))
    maquinasCartaoGateway.list(true).then((m) => setMaquinas(m.map((x) => ({ id: x.id, nome: x.nome }))))
  }

  useEffect(() => {
    load()
  }, [])

  const exigeContaBanco = form.formaPagamento === 'pix' || form.formaPagamento === 'cartao'

  const modalidadeSelecionada = useMemo(() => {
    if (form.formaPagamento !== 'cartao' || !form.modalidadeCartao) return null
    return MODALIDADES_CARTAO.find((m) => m.value === form.modalidadeCartao)
  }, [form.formaPagamento, form.modalidadeCartao])

  useEffect(() => {
    if (form.formaPagamento !== 'cartao' || !form.maquinaCartaoId || !modalidadeSelecionada) {
      setTaxaConfigurada(null)
      return
    }
    maquinasCartaoGateway
      .getTaxaByModalidade(form.maquinaCartaoId, modalidadeSelecionada.tipo, modalidadeSelecionada.parcelas)
      .then((t) => setTaxaConfigurada(t ? { taxaPercentual: t.taxaPercentual } : null))
      .catch(() => setTaxaConfigurada(null))
  }, [form.formaPagamento, form.maquinaCartaoId, modalidadeSelecionada?.tipo, modalidadeSelecionada?.parcelas])

  const valorBruto = parseCurrencyFromInput(form.valor)
  const calculoCartao = useMemo(() => {
    if (form.formaPagamento !== 'cartao' || !taxaConfigurada || valorBruto <= 0) return null
    return calcularValorLiquidoCartao(valorBruto, taxaConfigurada.taxaPercentual)
  }, [form.formaPagamento, taxaConfigurada, valorBruto])

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (v: Venda) => {
    setEditingId(v.id)
    const modalidade =
      v.formaPagamento === 'cartao' && v.tipoPagamentoCartao && v.quantidadeParcelas
        ? MODALIDADES_CARTAO.find(
            (m) => m.tipo === v.tipoPagamentoCartao && m.parcelas === v.quantidadeParcelas
          )?.value ?? ''
        : ''
    setForm({
      descricao: v.descricao,
      valor: formatCurrencyForInput(v.valorBruto ?? v.valor),
      formaPagamento: v.formaPagamento,
      maquinaCartaoId: v.maquinaCartaoId ?? '',
      modalidadeCartao: modalidade,
      contaBancoId: v.contaBancoId ?? '',
    })
    setModalOpen(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseCurrencyFromInput(form.valor)
    if (!form.descricao.trim() || valor <= 0) return
    if (exigeContaBanco && !form.contaBancoId) {
      alert('Selecione a conta banco que recebeu o pagamento (PIX e cartão).')
      return
    }
    if (form.formaPagamento === 'cartao') {
      if (!form.maquinaCartaoId) {
        alert('Selecione a máquina de cartão utilizada na venda.')
        return
      }
      if (!modalidadeSelecionada) {
        alert('Selecione o tipo de cartão (Débito ou Crédito parcelado).')
        return
      }
      if (!taxaConfigurada) {
        alert('Não existe taxa cadastrada para esta máquina de cartão nesta modalidade.')
        return
      }
    }
    const data = editingId ? (storageVendas.getById(editingId)?.data ?? new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10)
    const criadoEm = editingId ? (storageVendas.getById(editingId)?.criadoEm ?? new Date().toISOString()) : new Date().toISOString()

    let venda: Venda
    if (form.formaPagamento === 'cartao' && form.maquinaCartaoId && modalidadeSelecionada && taxaConfigurada) {
      const maquina = maquinas.find((m) => m.id === form.maquinaCartaoId)
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(valor, taxaConfigurada.taxaPercentual)
      venda = {
        id: editingId ?? crypto.randomUUID(),
        descricao: form.descricao.trim(),
        valor: valorLiquido,
        formaPagamento: 'cartao',
        maquinaCartaoId: form.maquinaCartaoId,
        maquinaCartaoNome: maquina?.nome,
        tipoPagamentoCartao: modalidadeSelecionada.tipo,
        quantidadeParcelas: modalidadeSelecionada.parcelas,
        valorBruto: valor,
        taxaPercentualCartao: taxaConfigurada.taxaPercentual,
        valorTaxaCartao: valorTaxa,
        valorLiquido,
        contaBancoId: form.contaBancoId,
        data,
        criadoEm,
      }
    } else {
      venda = {
        id: editingId ?? crypto.randomUUID(),
        descricao: form.descricao.trim(),
        valor,
        formaPagamento: form.formaPagamento,
        contaBancoId: exigeContaBanco ? form.contaBancoId : undefined,
        data,
        criadoEm,
      }
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

  const remove = (id: string) => {
    if (!confirm('Excluir esta venda?')) return
    excluirVenda(id)
    load()
  }

  const totaisPorForma = FORMAS.reduce((acc, forma) => {
    acc[forma] = vendas.filter((v) => v.formaPagamento === forma).reduce((s, v) => s + v.valor, 0)
    return acc
  }, {} as Record<FormaPagamentoVenda, number>)
  const totalGeral = vendas.reduce((s, v) => s + v.valor, 0)

  const labelForma = (f: FormaPagamentoVenda) =>
    f === 'pix' ? 'PIX' : f === 'dinheiro' ? 'Dinheiro' : 'Cartão'

  const labelFormaVenda = (v: Venda) => {
    if (v.formaPagamento === 'cartao') {
      if (v.tipoPagamentoCartao === 'debito') return 'Cartão Débito'
      return `Cartão Crédito ${v.quantidadeParcelas ?? 1}x`
    }
    return labelForma(v.formaPagamento)
  }

  return (
    <>
      <h1 className="page-title">Controle de Vendas</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Registre vendas com a forma de pagamento: <strong>PIX</strong>, <strong>Dinheiro</strong> ou <strong>Cartão</strong>.
        Vendas em PIX e cartão podem ser vinculadas a uma conta banco. Para cartão, o valor líquido (após taxa da operadora) é lançado no financeiro.
      </p>
      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Nova venda
        </button>
      </div>

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div className="card-saldo">
          <h3>Total de vendas (líquido)</h3>
          <div className="valor saldo-positivo">{formatMoney(totalGeral)}</div>
        </div>
        {FORMAS.map((forma) => (
          <div key={forma} className="card-saldo">
            <h3>{labelForma(forma)}</h3>
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
              <th>Conta (PIX/Cartão)</th>
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
            {[...vendas].sort((a, b) => parseDateOnly(b.data).getTime() - parseDateOnly(a.data).getTime()).map((v) => (
              <tr key={v.id}>
                <td>{formatDateBR(v.data)}</td>
                <td>{v.descricao}</td>
                <td>{formatMoney(v.valor)}</td>
                <td>
                  <span className="badge badge-info">{labelFormaVenda(v)}</span>
                </td>
                <td>
                  {v.contaBancoId
                    ? contas.find((c) => c.id === v.contaBancoId)?.nome ?? '-'
                    : '-'}
                </td>
                <td>
                  <button type="button" className="btn btn-secondary" onClick={() => openEdit(v)} style={{ marginRight: 8 }}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => remove(v.id)}>
                    Excluir
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
                <label>Valor bruto (R$)</label>
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
                      maquinaCartaoId: e.target.value === 'cartao' ? f.maquinaCartaoId : '',
                      modalidadeCartao: e.target.value === 'cartao' ? f.modalidadeCartao : '',
                      contaBancoId: e.target.value === 'dinheiro' ? '' : f.contaBancoId,
                    }))
                  }
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                </select>
              </div>
              {form.formaPagamento === 'cartao' && (
                <>
                  <div className="form-group">
                    <label>Máquina de cartão</label>
                    <select
                      value={form.maquinaCartaoId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          maquinaCartaoId: e.target.value,
                          modalidadeCartao: '',
                        }))
                      }
                      required
                    >
                      <option value="">Selecione</option>
                      {maquinas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de cartão</label>
                    <select
                      value={form.modalidadeCartao}
                      onChange={(e) => setForm((f) => ({ ...f, modalidadeCartao: e.target.value }))}
                      required
                    >
                      <option value="">Selecione</option>
                      {MODALIDADES_CARTAO.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {calculoCartao && taxaConfigurada && (
                    <div className="card" style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)' }}>
                      <h4 style={{ marginBottom: 8, fontSize: '0.9rem' }}>Resumo</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem' }}>
                        <span>Valor bruto: {formatMoney(valorBruto)}</span>
                        <span>Taxa: {taxaConfigurada.taxaPercentual.toFixed(2)}%</span>
                        <span>Valor da taxa: {formatMoney(calculoCartao.valorTaxa)}</span>
                        <span style={{ fontWeight: 600 }}>Valor líquido a receber: {formatMoney(calculoCartao.valorLiquido)}</span>
                      </div>
                    </div>
                  )}
                  {form.maquinaCartaoId && form.modalidadeCartao && !taxaConfigurada && valorBruto > 0 && (
                    <p style={{ color: 'var(--warning)', fontSize: '0.9rem', marginBottom: 12 }}>
                      Não existe taxa cadastrada para esta máquina de cartão nesta modalidade. Configure em Configurações → Máquinas de Cartão.
                    </p>
                  )}
                </>
              )}
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                  form.formaPagamento === 'cartao' &&
                  (!form.maquinaCartaoId || !modalidadeSelecionada || !taxaConfigurada)
                }
                >
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
