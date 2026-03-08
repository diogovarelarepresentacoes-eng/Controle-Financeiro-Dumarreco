import { useState } from 'react'
import { productsGateway } from '../services/productsGateway'

export default function ImportarProdutos() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; previewRows: Record<string, unknown>[]; suggestedMapping: Record<string, string | null> } | null>(null)
  const [mode, setMode] = useState<'INSERT_ONLY' | 'UPSERT_ALL'>('UPSERT_ALL')
  const [result, setResult] = useState<{ jobId: string; totals: Record<string, number> } | null>(null)
  const [feedback, setFeedback] = useState('')

  async function handleFile(next: File | null) {
    setFile(next)
    setPreview(null)
    setResult(null)
    if (!next) return
    const data = await productsGateway.previewImport(next, 'products')
    setPreview(data)
  }

  async function process() {
    if (!file || !preview?.suggestedMapping?.code) {
      setFeedback('Selecione arquivo e confirme mapeamento de codigo.')
      return
    }
    const response = await productsGateway.importProducts(file, {
      mode,
      mapping: {
        code: preview.suggestedMapping.code,
        description: preview.suggestedMapping.description ?? undefined,
        priceInstallment: preview.suggestedMapping.priceInstallment ?? undefined,
        stockBalance: preview.suggestedMapping.stockBalance ?? undefined,
      },
      createdBy: 'dashboard',
    })
    setResult(response)
    setFeedback('Importacao concluida.')
  }

  return (
    <section>
      <h1 className="page-title">Cadastros - Importar Produtos (Planilha)</h1>
      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label>Arquivo CSV/XLSX</label>
            <input type="file" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <label><input type="radio" checked={mode === 'INSERT_ONLY'} onChange={() => setMode('INSERT_ONLY')} /> Inserir apenas novos</label>
          <label><input type="radio" checked={mode === 'UPSERT_ALL'} onChange={() => setMode('UPSERT_ALL')} /> Inserir novos e atualizar existentes</label>
        </div>
        <button className="btn btn-primary" onClick={process}>Processar importacao</button>
        {feedback ? <p style={{ marginTop: 12 }}>{feedback}</p> : null}
        {result ? <pre style={{ marginTop: 12 }}>{JSON.stringify(result, null, 2)}</pre> : null}
      </div>
      {preview ? (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Pre-visualizacao (20 linhas)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {preview.headers.map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((r, idx) => (
                  <tr key={idx}>
                    {preview.headers.map((h) => <td key={`${idx}-${h}`}>{String(r[h] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
