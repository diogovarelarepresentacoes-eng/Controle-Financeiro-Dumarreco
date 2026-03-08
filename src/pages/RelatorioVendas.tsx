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
      { key: 'cartao', label: 'Cartao (liquido)' },
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

  const totalBruto = vendasFiltradas.reduce((s, v) => s + (v.valorBruto ?? v.valor), 0)
  const totalTaxas = vendasFiltradas.reduce((s, v) => s + (v.valorTaxaCartao ?? 0), 0)

  const detalhamentoPorMaquina = useMemo(() => {
    const vendasCartao = vendasFiltradas.filter((v) => v.formaPagamento === 'cartao')
    const map = new Map<string, { nome: string; bruto: number; taxas: number; liquido: number }>()
    for (const v of vendasCartao) {
      const key = v.maquinaCartaoId ?? '__sem_maquina__'
      const nome = v.maquinaCartaoNome ?? 'Não informada'
      const cur = map.get(key) ?? { nome, bruto: 0, taxas: 0, liquido: 0 }
      cur.bruto += v.valorBruto ?? v.valor
      cur.taxas += v.valorTaxaCartao ?? 0
      cur.liquido += v.valor
      map.set(key, cur)
    }
    return Array.from(map.values())
  }, [vendasFiltradas])

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
                <th>Valor bruto</th>
                <th>Taxa</th>
                <th>Valor liquido</th>
                <th>Forma de pagamento</th>
                <th>Maquina (Cartao)</th>
                <th>Conta (PIX/Cartao)</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhuma venda no periodo.
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((v) => (
                  <tr key={v.id}>
                    <td>{format(parseISO(v.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td>{v.descricao}</td>
                    <td>{formatMoney(v.valorBruto ?? v.valor)}</td>
                    <td>{v.valorTaxaCartao != null ? formatMoney(v.valorTaxaCartao) : '-'}</td>
                    <td>{formatMoney(v.valor)}</td>
                    <td>
                      {v.formaPagamento === 'pix' ? 'PIX' : v.formaPagamento === 'dinheiro' ? 'Dinheiro' : v.tipoPagamentoCartao === 'debito' ? 'Cartao Debito' : `Cartao Credito ${v.quantidadeParcelas ?? 1}x`}
                    </td>
                    <td>{v.formaPagamento === 'cartao' ? (v.maquinaCartaoNome ?? '-') : '-'}</td>
                    <td>{v.contaBancoId ? nomeConta(v.contaBancoId) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {detalhamentoPorMaquina.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 24, marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>Detalhamento por maquina de cartao</h3>
            <table className="relatorio-tabela">
              <thead>
                <tr>
                  <th>Maquina</th>
                  <th>Total bruto</th>
                  <th>Total taxas</th>
                  <th>Total liquido</th>
                </tr>
              </thead>
              <tbody>
                {detalhamentoPorMaquina.map((d) => (
                  <tr key={d.nome}>
                    <td>{d.nome}</td>
                    <td>{formatMoney(d.bruto)}</td>
                    <td>{formatMoney(d.taxas)}</td>
                    <td>{formatMoney(d.liquido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="relatorio-total" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong>Total bruto: {formatMoney(totalBruto)}</strong>
          <strong>Total taxas: {formatMoney(totalTaxas)}</strong>
          <strong>Total liquido no periodo: {formatMoney(totalVendas)}</strong>
        </div>
      </section>

      <p className="relatorio-rodape" style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Controle Financeiro Dumarreco - Relatorio gerado em {format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}.
      </p>
    </div>
  )
}
