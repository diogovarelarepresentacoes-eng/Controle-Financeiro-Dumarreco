import { useState, useEffect, useRef } from 'react'
import type { Boleto } from '../types'
import { storageBoletos } from '../services/storage'
import { applyCurrencyMask, parseCurrencyFromInput } from '../utils/currencyMask'
import { parseNFeXml } from '../utils/nfeXmlParser'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

export default function Boletos() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ descricao: '', valor: '', vencimento: '' })
  const [importando, setImportando] = useState(false)
  const [importacaoResultado, setImportacaoResultado] = useState<{ ok: number; erros: number } | null>(null)
  const inputXmlRef = useRef<HTMLInputElement>(null)

  const load = () => setBoletos(storageBoletos.getAll())

  useEffect(() => {
    load()
  }, [])

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
    let ok = 0
    let erros = 0
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
          storageBoletos.save({
            id: crypto.randomUUID(),
            descricao: dados.descricao,
            valor: dados.valor,
            vencimento: dados.vencimento,
            pago: false,
            criadoEm: new Date().toISOString(),
          })
          ok++
        } else {
          erros++
        }
      } catch {
        erros++
      }
    }
    setImportacaoResultado({ ok, erros })
    setImportando(false)
    load()
    e.target.value = ''
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseCurrencyFromInput(form.valor)
    if (!form.descricao.trim() || valor <= 0) return
    storageBoletos.save({
      id: crypto.randomUUID(),
      descricao: form.descricao.trim(),
      valor,
      vencimento: form.vencimento || new Date().toISOString().slice(0, 10),
      pago: false,
      criadoEm: new Date().toISOString(),
    })
    setForm({ descricao: '', valor: '', vencimento: '' })
    setModalOpen(false)
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
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          Novo boleto
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
              </tr>
            </thead>
            <tbody>
              {pendentes.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--text-muted)', padding: 16 }}>
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
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--text-muted)', padding: 16 }}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Novo boleto</h2>
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
                />
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
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
