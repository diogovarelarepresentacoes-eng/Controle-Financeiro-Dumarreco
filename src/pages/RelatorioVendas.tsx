import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { storageContas, storageVendas } from '../services/storage'

export default function RelatorioVendas() {
  const hoje = new Date()
  const dataInicioPadrao = format(startOfMonth(hoje), 'yyyy-MM-dd')
  const dataFimPadrao = format(endOfMonth(hoje), 'yyyy-MM-dd')

  const [dataInicioVendas, setDataInicioVendas] = useState(dataInicioPadrao)
  const [dataFimVendas, setDataFimVendas] = useState(dataFimPadrao)

  const vendas = useMemo(() => storageVendas.getAll(), [])
  const contas = useMemo(() => storageContas.getAll(), [])

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const nomeConta = (id: string) => contas.find((c) => c.id === id)?.nome ?? '-'

  const datasVendasPreenchidas = Boolean(dataInicioVendas && dataFimVendas)
  const intervaloVendasValido = datasVendasPreenchidas && dataInicioVendas <= dataFimVendas

  const vendasFiltradas = useMemo(() => {
    if (!intervaloVendasValido) return []
    return vendas
      .filter((v) => v.data >= dataInicioVendas && v.data <= dataFimVendas)
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [vendas, dataInicioVendas, dataFimVendas, intervaloVendasValido])

  const totalVendas = vendasFiltradas.reduce((s, v) => s + v.valor, 0)

  const referenciaAtual = dataFimVendas || format(hoje, 'yyyy-MM-dd')
  const referenciaAnterior = format(subDays(parseISO(referenciaAtual), 1), 'yyyy-MM-dd')

  const totaisFormaPagamento = useMemo(() => {
    const formas = [
      { key: 'pix', label: 'PIX' },
      { key: 'dinheiro', label: 'Dinheiro' },
      { key: 'debito', label: 'Debito' },
      { key: 'credito', label: 'Credito' },
    ] as const

    return formas.map((forma) => {
      const saldoAnterior = vendas
        .filter((v) => v.formaPagamento === forma.key && v.data <= referenciaAnterior)
        .reduce((s, v) => s + v.valor, 0)

      const saldoAtual = vendas
        .filter((v) => v.formaPagamento === forma.key && v.data <= referenciaAtual)
        .reduce((s, v) => s + v.valor, 0)

      return {
        ...forma,
        saldoAnterior,
        saldoAtual,
      }
    })
  }, [vendas, referenciaAnterior, referenciaAtual])

  const imprimir = () => {
    window.print()
  }

  return (
    <div className="relatorios-page">
      <h1 className="page-title no-print">Relatorio de Vendas</h1>
      <p className="no-print" style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Gere o relatorio apenas de vendas no periodo desejado e use &quot;Imprimir / Salvar em PDF&quot;.
      </p>

      <div className="relatorio-botoes no-print" style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-primary" onClick={imprimir}>
          Imprimir / Salvar em PDF
        </button>
      </div>

      <section className="card relatorio-section">
        <h2 className="relatorio-titulo">Relatorio de Vendas</h2>
        <div className="no-print relatorio-filtros">
          <div className="form-row" style={{ alignItems: 'flex-end', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data inicial</label>
              <input
                type="date"
                value={dataInicioVendas}
                onChange={(e) => setDataInicioVendas(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data final</label>
              <input
                type="date"
                value={dataFimVendas}
                onChange={(e) => setDataFimVendas(e.target.value)}
              />
            </div>
          </div>
        </div>

        <p className="relatorio-periodo">
          Periodo:{' '}
          {intervaloVendasValido
            ? `${format(parseISO(dataInicioVendas), 'dd/MM/yyyy', { locale: ptBR })} ate ${format(parseISO(dataFimVendas), 'dd/MM/yyyy', { locale: ptBR })}`
            : 'intervalo invalido'}
        </p>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Totalizadores acumulados por forma de pagamento considerando saldo do dia anterior e do dia atual.
        </p>

        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>Totalizador</th>
                <th>Saldo anterior ({format(parseISO(referenciaAnterior), 'dd/MM/yyyy', { locale: ptBR })})</th>
                <th>Saldo atual ({format(parseISO(referenciaAtual), 'dd/MM/yyyy', { locale: ptBR })})</th>
              </tr>
            </thead>
            <tbody>
              {totaisFormaPagamento.map((t) => (
                <tr key={t.key}>
                  <td>{t.label}</td>
                  <td>{formatMoney(t.saldoAnterior)}</td>
                  <td>{formatMoney(t.saldoAtual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!intervaloVendasValido && (
          <p style={{ color: 'var(--warning)', fontSize: '0.9rem', marginBottom: 12 }}>
            Preencha as duas datas e use um intervalo valido (inicial menor ou igual a final) para exibir as vendas.
          </p>
        )}

        <div className="table-wrap">
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descricao</th>
                <th>Valor</th>
                <th>Forma de pagamento</th>
                <th>Conta (PIX/Deb/Cred)</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhuma venda no periodo.
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((v) => (
                  <tr key={v.id}>
                    <td>{format(parseISO(v.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td>{v.descricao}</td>
                    <td>{formatMoney(v.valor)}</td>
                    <td>
                      {v.formaPagamento === 'pix' ? 'PIX' : v.formaPagamento === 'dinheiro' ? 'Dinheiro' : v.formaPagamento === 'debito' ? 'Debito' : 'Credito'}
                    </td>
                    <td>{v.contaBancoId ? nomeConta(v.contaBancoId) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="relatorio-total">
          <strong>Total de vendas no periodo: {formatMoney(totalVendas)}</strong>
        </p>
      </section>

      <p className="relatorio-rodape" style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Controle Financeiro Dumarreco - Relatorio gerado em {format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}.
      </p>
    </div>
  )
}
