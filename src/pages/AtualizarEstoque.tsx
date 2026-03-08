import { useState } from 'react'
import { productsGateway } from '../services/productsGateway'

export default function AtualizarEstoque() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; previewRows: Record<string, unknown>[]; suggestedMapping: Record<string, string | null> } | null>(null)
  const [createIfMissing, setCreateIfMissing] = useState(true)
  const [updateMode, setUpdateMode] = useState<'SET' | 'ADD'>('SET')
  const [result, setResult] = useState<{ jobId: string; totals: Record<string, number> } | null>(null)
  const [feedback, setFeedback] = useState('')

  async function handleFile(next: File | null) {
    setFile(next)
    setPreview(null)
    setResult(null)
    if (!next) return
    const data = await productsGateway.previewImport(next, 'stock')
    setPreview(data)
  }

  async function process() {
    if (!file || !preview?.suggestedMapping?.code || !preview?.suggestedMapping?.stockBalance) {
      setFeedback('Mapeamento obrigatorio: codigo_do_produto e saldo_estoque.')
      return
    }
    const response = await productsGateway.importStock(file, {
      create_if_missing: createIfMissing,
      update_mode: updateMode,
      createdBy: 'dashboard',
      mapping: {
        code: preview.suggestedMapping.code,
        stockBalance: preview.suggestedMapping.stockBalance,
        description: preview.suggestedMapping.description ?? undefined,
        priceInstallment: preview.suggestedMapping.priceInstallment ?? undefined,
      },
    })
    setResult(response)
    setFeedback('Atualizacao concluida.')
  }

  return (
    <section>
      <h1 className="page-title">Estoque - Atualizar Estoque (Planilha)</h1>
      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label>Arquivo CSV/XLSX</label>
            <input type="file" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label><input type="checkbox" checked={createIfMissing} onChange={(e) => setCreateIfMissing(e.target.checked)} /> Se produto nao existir, cadastrar</label>
          <label><input type="radio" checked={updateMode === 'SET'} onChange={() => setUpdateMode('SET')} /> Substituir saldo</label>
          <label><input type="radio" checked={updateMode === 'ADD'} onChange={() => setUpdateMode('ADD')} /> Somar ao saldo</label>
        </div>
        <button className="btn btn-primary" onClick={process}>Atualizar</button>
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
