import { useState, useEffect } from 'react'
import type { Boleto, OrigemPagamento } from '../types'
import { storageBoletos, storageContas, registrarBaixaBoleto, getSaldoDinheiro } from '../services/storage'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

export default function BaixaBoleto() {
  const [pendentes, setPendentes] = useState<Boleto[]>([])
  const [contas, setContas] = useState(storageContas.getAll().filter((c) => c.ativo))
  const [selecionado, setSelecionado] = useState<Boleto | null>(null)
  const [origem, setOrigem] = useState<OrigemPagamento>('dinheiro')
  const [contaBancoId, setContaBancoId] = useState('')

  const load = () => {
    setPendentes(storageBoletos.getPendentes())
    setContas(storageContas.getAll().filter((c) => c.ativo))
  }

  useEffect(() => {
    load()
  }, [])

  const saldoDinheiro = getSaldoDinheiro()

  const darBaixa = () => {
    if (!selecionado) return
    if (origem === 'dinheiro' && saldoDinheiro < selecionado.valor) {
      alert(`Saldo em dinheiro insuficiente. Saldo disponível: ${formatMoney(saldoDinheiro)}. Valor do boleto: ${formatMoney(selecionado.valor)}.`)
      return
    }
    if (origem === 'conta_banco' && !contaBancoId) {
      alert('Selecione a conta banco de origem do pagamento.')
      return
    }
    registrarBaixaBoleto(selecionado, origem, origem === 'conta_banco' ? contaBancoId : undefined)
    setSelecionado(null)
    setOrigem('dinheiro')
    setContaBancoId('')
    load()
  }

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <>
      <h1 className="page-title">Baixa de Boleto</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Selecione o boleto e informe de onde saiu o pagamento: <strong>Dinheiro</strong> ou <strong>Conta banco</strong>. Pagamentos pela conta banco atualizam o saldo automaticamente.
      </p>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Boletos pendentes</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--text-muted)', padding: 24 }}>
                    Nenhum boleto pendente para baixa.
                  </td>
                </tr>
              )}
              {pendentes.map((b) => (
                <tr
                  key={b.id}
                  style={{ background: selecionado?.id === b.id ? 'rgba(29, 155, 240, 0.15)' : undefined }}
                >
                  <td>
                    <input
                      type="radio"
                      name="boleto"
                      checked={selecionado?.id === b.id}
                      onChange={() => setSelecionado(b)}
                    />
                  </td>
                  <td>{b.descricao}</td>
                  <td>{formatMoney(b.valor)}</td>
                  <td>{b.vencimento ? format(new Date(b.vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selecionado && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Origem do pagamento</h3>
          <p style={{ marginBottom: 16 }}>
            Boleto: <strong>{selecionado.descricao}</strong> — {formatMoney(selecionado.valor)}
          </p>

          {/* Saldo disponível para pagamento */}
          <div className="card" style={{ marginBottom: 20, padding: 16, background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <h4 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Saldo para realizar o pagamento</h4>
            {origem === 'dinheiro' ? (() => {
              const suficiente = saldoDinheiro >= selecionado.valor
              const novoSaldo = saldoDinheiro - selecionado.valor
              return (
                <>
                  <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>
                    Saldo disponível em dinheiro: <span className={saldoDinheiro >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(saldoDinheiro)}</span>
                    {suficiente ? (
                      <span style={{ color: 'var(--success)', marginLeft: 8 }}>✓ Suficiente para pagar {formatMoney(selecionado.valor)}</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', marginLeft: 8 }}>✗ Insuficiente para pagar {formatMoney(selecionado.valor)}</span>
                    )}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Saldo em dinheiro após o pagamento: <span className={novoSaldo >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(novoSaldo)}</span>
                  </p>
                </>
              )
            })() : contaBancoId ? (() => {
              const conta = contas.find((c) => c.id === contaBancoId)
              const saldoDisponivel = conta?.saldoAtual ?? 0
              const suficiente = saldoDisponivel >= selecionado.valor
              const novoSaldo = saldoDisponivel - selecionado.valor
              return (
                <>
                  <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>
                    Conta selecionada: <strong>{conta?.nome}</strong> — {conta?.banco}
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>
                    Saldo disponível: <span className={saldoDisponivel >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(saldoDisponivel)}</span>
                    {suficiente ? (
                      <span style={{ color: 'var(--success)', marginLeft: 8 }}>✓ Suficiente para pagar {formatMoney(selecionado.valor)}</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', marginLeft: 8 }}>✗ Insuficiente para pagar {formatMoney(selecionado.valor)}</span>
                    )}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Saldo após o pagamento: <span className={novoSaldo >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(novoSaldo)}</span>
                  </p>
                </>
              )
            })() : (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Selecione uma conta banco abaixo para ver o saldo disponível.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>De onde saiu o dinheiro?</label>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="origem"
                  checked={origem === 'dinheiro'}
                  onChange={() => setOrigem('dinheiro')}
                />
                Dinheiro
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="origem"
                  checked={origem === 'conta_banco'}
                  onChange={() => setOrigem('conta_banco')}
                />
                Conta banco
              </label>
            </div>
          </div>
          {origem === 'conta_banco' && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Conta banco (saldo será debitado)</label>
              <select
                value={contaBancoId}
                onChange={(e) => setContaBancoId(e.target.value)}
                required={origem === 'conta_banco'}
              >
                <option value="">Selecione a conta</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.banco} (Saldo: {formatMoney(c.saldoAtual)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={darBaixa}
              disabled={
                (origem === 'dinheiro' && saldoDinheiro < selecionado.valor) ||
                (origem === 'conta_banco' && !contaBancoId)
              }
            >
              Confirmar baixa
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setSelecionado(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
