import { useState, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { storageVendas, storageBoletos, storageContas } from '../services/storage'

const MESES = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
]
const ANO_ATUAL = new Date().getFullYear()
const ANOS = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - 2 + i)

export default function Relatorios() {
  const hoje = new Date()
  const dataInicioPadrao = format(startOfMonth(hoje), 'yyyy-MM-dd')
  const dataFimPadrao = format(endOfMonth(hoje), 'yyyy-MM-dd')

  const [dataInicioVendas, setDataInicioVendas] = useState(dataInicioPadrao)
  const [dataFimVendas, setDataFimVendas] = useState(dataFimPadrao)
  const [mesBoletos, setMesBoletos] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [anoBoletos, setAnoBoletos] = useState(String(ANO_ATUAL))

  const vendas = useMemo(() => storageVendas.getAll(), [])
  const boletos = useMemo(() => storageBoletos.getAll(), [])
  const contas = useMemo(() => storageContas.getAll(), [])

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const nomeConta = (id: string) => contas.find((c) => c.id === id)?.nome ?? '-'

  const datasVendasPreenchidas = Boolean(dataInicioVendas && dataFimVendas)
  const intervaloVendasValido = datasVendasPreenchidas && dataInicioVendas <= dataFimVendas

  // Vendas do intervalo selecionado
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
      { key: 'debito', label: 'Débito' },
      { key: 'credito', label: 'Crédito' },
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

  // Boletos pagos do mês/ano selecionado (por data de pagamento)
  const boletosPagosFiltrados = useMemo(() => {
    const inicio = startOfMonth(new Date(Number(anoBoletos), Number(mesBoletos) - 1))
    const fim = endOfMonth(inicio)
    return boletos
      .filter((b) => b.pago && b.dataPagamento)
      .filter((b) => {
        const d = parseISO(b.dataPagamento!)
        return isWithinInterval(d, { start: inicio, end: fim })
      })
      .sort((a, b) => (a.dataPagamento ?? '').localeCompare(b.dataPagamento ?? ''))
  }, [boletos, mesBoletos, anoBoletos])

  const totalBoletosPagos = boletosPagosFiltrados.reduce((s, b) => s + b.valor, 0)

  const imprimir = () => {
    window.print()
  }

  return (
    <div className="relatorios-page">
      <h1 className="page-title no-print">Relatórios</h1>
      <p className="no-print" style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Gere relatórios de vendas e boletos pagos por mês e ano. Use &quot;Imprimir / Salvar em PDF&quot; e escolha &quot;Salvar como PDF&quot; na janela de impressão.
      </p>

      <div className="relatorio-botoes no-print" style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-primary" onClick={imprimir}>
          Imprimir / Salvar em PDF
        </button>
      </div>

      {/* Relatório de Vendas */}
      <section className="card relatorio-section">
        <h2 className="relatorio-titulo">Relatório de Vendas</h2>
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
          Período:{' '}
          {intervaloVendasValido
            ? `${format(parseISO(dataInicioVendas), 'dd/MM/yyyy', { locale: ptBR })} até ${format(parseISO(dataFimVendas), 'dd/MM/yyyy', { locale: ptBR })}`
            : 'intervalo inválido'}
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
            Preencha as duas datas e use um intervalo válido (inicial menor ou igual à final) para exibir as vendas.
          </p>
        )}
        <div className="table-wrap">
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Forma de pagamento</th>
                <th>Conta (PIX/Déb/Créd)</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhuma venda no período.
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((v) => (
                  <tr key={v.id}>
                    <td>{format(parseISO(v.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td>{v.descricao}</td>
                    <td>{formatMoney(v.valor)}</td>
                    <td>
                      {v.formaPagamento === 'pix' ? 'PIX' : v.formaPagamento === 'dinheiro' ? 'Dinheiro' : v.tipoPagamentoCartao === 'debito' ? 'Cartão Débito' : v.tipoPagamentoCartao === 'credito' ? `Cartão Crédito ${v.quantidadeParcelas ?? 1}x` : 'Cartão'}
                    </td>
                    <td>{v.contaBancoId ? nomeConta(v.contaBancoId) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="relatorio-total">
          <strong>Total de vendas no período: {formatMoney(totalVendas)}</strong>
        </p>
      </section>

      {/* Relatório de Boletos Pagos */}
      <section className="card relatorio-section">
        <h2 className="relatorio-titulo">Relatório de Boletos Pagos</h2>
        <div className="no-print relatorio-filtros">
          <div className="form-row" style={{ alignItems: 'flex-end', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mês</label>
              <select value={mesBoletos} onChange={(e) => setMesBoletos(e.target.value)}>
                {MESES.map((m) => (
                  <option key={m} value={m}>
                    {format(new Date(2000, Number(m) - 1), 'MMMM', { locale: ptBR })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Ano</label>
              <select value={anoBoletos} onChange={(e) => setAnoBoletos(e.target.value)}>
                {ANOS.map((a) => (
                  <option key={a} value={String(a)}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="relatorio-periodo">
          Período (data do pagamento): {format(new Date(Number(anoBoletos), Number(mesBoletos) - 1), 'MMMM yyyy', { locale: ptBR })}
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Boletos pagos por dia, com origem do pagamento (Banco ou Dinheiro).
        </p>
        <div className="table-wrap">
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>Data do pagamento</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Origem do pagamento</th>
                <th>Conta banco</th>
              </tr>
            </thead>
            <tbody>
              {boletosPagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhum boleto pago no período.
                  </td>
                </tr>
              ) : (
                boletosPagosFiltrados.map((b) => (
                  <tr key={b.id}>
                    <td>{b.dataPagamento ? format(parseISO(b.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                    <td>{b.descricao}</td>
                    <td>{formatMoney(b.valor)}</td>
                    <td>
                      {b.origemPagamento === 'conta_banco' ? 'Banco' : b.origemPagamento === 'dinheiro' ? 'Dinheiro' : '-'}
                    </td>
                    <td>{b.contaBancoId ? nomeConta(b.contaBancoId) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="relatorio-total">
          <strong>Total pago no período: {formatMoney(totalBoletosPagos)}</strong>
        </p>
      </section>

      <p className="relatorio-rodape" style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Controle Financeiro Dumarreco — Relatórios gerados em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
      </p>
    </div>
  )
}
