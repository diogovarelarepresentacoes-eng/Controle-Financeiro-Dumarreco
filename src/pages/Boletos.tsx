import { useState, useEffect, useRef } from 'react'
import type { Boleto } from '../types'
import type { NFeDados } from '../utils/nfeXmlParser'
import { storageBoletos, storageContas, registrarBaixaBoleto } from '../services/storage'
import { applyCurrencyMask, parseCurrencyFromInput, formatCurrencyForInput } from '../utils/currencyMask'
import { parseNFeXml } from '../utils/nfeXmlParser'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

type OrigemPagamentoNFe = 'dinheiro' | 'conta_banco' | 'pendente'

export default function Boletos() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ descricao: '', valor: '', vencimento: '' })
  const [modalParceladoOpen, setModalParceladoOpen] = useState(false)
  const [formParcelado, setFormParcelado] = useState({ descricao: '', valor: '', parcelas: 2, vencimento: '' })
  const [importando, setImportando] = useState(false)
  const [importacaoResultado, setImportacaoResultado] = useState<{ ok: number; erros: number } | null>(null)
  const inputXmlRef = useRef<HTMLInputElement>(null)
  const [modalPagamentoNFeOpen, setModalPagamentoNFeOpen] = useState(false)
  const [nfeParaPagamento, setNfeParaPagamento] = useState<{ dados: NFeDados; origem: OrigemPagamentoNFe; contaBancoId: string }[]>([])
  const [contas, setContas] = useState(storageContas.getAll().filter((c) => c.ativo))

  const load = () => {
    setBoletos(storageBoletos.getAll())
    setContas(storageContas.getAll().filter((c) => c.ativo))
  }

  useEffect(() => {
    load()
  }, [])

  function origemPadraoParaTpag(tPag?: string): OrigemPagamentoNFe {
    if (!tPag) return 'pendente'
    if (tPag === '01') return 'dinheiro'
    if (['03', '04', '17'].includes(tPag)) return 'conta_banco'
    return 'pendente'
  }

  const lerArquivoComoTexto = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file, 'UTF-8')
    })

  const importarXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setImportando(true)
    setImportacaoResultado(null)
    setModalPagamentoNFeOpen(false)
    let ok = 0
    let erros = 0
    const comFormaPagamento: NFeDados[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.name.toLowerCase().endsWith('.xml')) {
        erros++
        continue
      }
      try {
        const texto = await lerArquivoComoTexto(file)
        const dados = parseNFeXml(texto)
        if (dados) {
          if (dados.formaPagamentoDesc) {
            comFormaPagamento.push(dados)
          } else {
            storageBoletos.save({
              id: crypto.randomUUID(),
              descricao: dados.descricao,
              valor: dados.valor,
              vencimento: dados.vencimento,
              pago: false,
              criadoEm: new Date().toISOString(),
            })
            ok++
          }
        } else {
          erros++
        }
      } catch {
        erros++
      }
    }
    if (comFormaPagamento.length > 0) {
      setNfeParaPagamento(
        comFormaPagamento.map((dados) => ({
          dados,
          origem: origemPadraoParaTpag(dados.tPag) as OrigemPagamentoNFe,
          contaBancoId: '',
        }))
      )
      setModalPagamentoNFeOpen(true)
    }
    setImportacaoResultado({ ok, erros })
    setImportando(false)
    load()
    e.target.value = ''
  }

  const setItemPagamento = (index: number, upd: Partial<{ origem: OrigemPagamentoNFe; contaBancoId: string }>) => {
    setNfeParaPagamento((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...upd } : item))
    )
  }

  const confirmarPagamentosNFe = () => {
    for (const item of nfeParaPagamento) {
      const boleto: Boleto = {
        id: crypto.randomUUID(),
        descricao: item.dados.descricao,
        valor: item.dados.valor,
        vencimento: item.dados.vencimento,
        pago: false,
        criadoEm: new Date().toISOString(),
      }
      storageBoletos.save(boleto)
      if (item.origem !== 'pendente') {
        registrarBaixaBoleto(
          boleto,
          item.origem,
          item.origem === 'conta_banco' ? item.contaBancoId || undefined : undefined
        )
      }
    }
    setModalPagamentoNFeOpen(false)
    setNfeParaPagamento([])
    load()
  }

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
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Novo boleto
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setModalParceladoOpen(true)}>
          Parcelado (cartão crédito)
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            ref={inputXmlRef}
            type="file"
            accept=".xml"
            multiple
            onChange={importarXml}
            disabled={importando}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => inputXmlRef.current?.click()}
            disabled={importando}
          >
            {importando ? 'Importando...' : 'Importar de NFe (XML)'}
          </button>
          {importacaoResultado && (
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {importacaoResultado.ok > 0 && <span style={{ color: 'var(--success)' }}>{importacaoResultado.ok} boleto(s) importado(s)</span>}
              {importacaoResultado.erros > 0 && (
                <span style={{ color: 'var(--warning)', marginLeft: importacaoResultado.ok > 0 ? 8 : 0 }}>
                  {importacaoResultado.erros} arquivo(s) ignorado(s) ou inválido(s)
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Importação de Notas Fiscais Eletrônicas (NFe)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
          Selecione um ou mais arquivos XML de NFe. Serão criados boletos com descrição (número da nota + emitente), valor total (vNF) e vencimento (data de emissão). Você pode editar os boletos após a importação se precisar ajustar o vencimento.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => inputXmlRef.current?.click()}
          disabled={importando}
        >
          Selecionar arquivos XML
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
                  <td>{b.vencimento ? format(new Date(b.vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
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
                  <td>{b.dataPagamento ? format(new Date(b.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
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

      {modalPagamentoNFeOpen && nfeParaPagamento.length > 0 && (
        <div className="modal-overlay" onClick={() => { setModalPagamentoNFeOpen(false); setNfeParaPagamento([]) }}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h2>Forma de pagamento da Nota Fiscal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
              A(s) nota(s) fiscal(is) importada(s) contêm forma de pagamento no XML. Informe como deseja lançar o pagamento no controle (ou deixe como pendente).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {nfeParaPagamento.map((item, index) => (
                <div
                  key={index}
                  className="card"
                  style={{ padding: 16, background: 'var(--bg-input)', borderColor: 'var(--border)' }}
                >
                  <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{item.dados.descricao}</p>
                  <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Valor: {formatMoney(item.dados.valor)} — Forma na NFe: <strong>{item.dados.formaPagamentoDesc ?? '-'}</strong>
                  </p>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Como lançar o pagamento?</label>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`origem-${index}`}
                          checked={item.origem === 'dinheiro'}
                          onChange={() => setItemPagamento(index, { origem: 'dinheiro', contaBancoId: '' })}
                        />
                        Dinheiro
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`origem-${index}`}
                          checked={item.origem === 'conta_banco'}
                          onChange={() => setItemPagamento(index, { origem: 'conta_banco' })}
                        />
                        Conta banco (PIX/Crédito/Débito)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`origem-${index}`}
                          checked={item.origem === 'pendente'}
                          onChange={() => setItemPagamento(index, { origem: 'pendente', contaBancoId: '' })}
                        />
                        Deixar como pendente
                      </label>
                    </div>
                  </div>
                  {item.origem === 'conta_banco' && (
                    <div className="form-group" style={{ marginTop: 8 }}>
                      <label>Conta banco</label>
                      <select
                        value={item.contaBancoId}
                        onChange={(e) => setItemPagamento(index, { contaBancoId: e.target.value })}
                      >
                        <option value="">Selecione a conta</option>
                        {contas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} — {c.banco}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setModalPagamentoNFeOpen(false); setNfeParaPagamento([]) }}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmarPagamentosNFe}
                disabled={nfeParaPagamento.some((i) => i.origem === 'conta_banco' && !i.contaBancoId)}
              >
                Confirmar e criar boleto(s)
              </button>
            </div>
          </div>
        </div>
      )}

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
